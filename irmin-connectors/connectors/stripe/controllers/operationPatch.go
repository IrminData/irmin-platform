package stripecontrollers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"

	"irmin-connectors/connectors/common"
	stripeclient "irmin-connectors/connectors/stripe/client"
	"irmin-connectors/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// OperationPatch applies a JSON-Patch document to Stripe resources.
// Each patch op's `path` is a JSON-Pointer that starts with a Stripe
// resource file path (e.g., `/customers/cus_abc.json/email`). The
// suffix after the file path is the pointer into the resource record;
// we translate it to Stripe's bracketed form field (e.g., `email`,
// `metadata[plan]`, `items[0][price]`).
//
// Unlike push (which sends the whole record), patch sends only the
// touched fields — safer for concurrent edits because it won't clobber
// fields modified between pull + patch.
//
// Multiple patch ops targeting the same resource are coalesced into a
// single Stripe update call so that Stripe's partial-update semantics
// apply atomically per resource.
//
// @Summary Apply JSON-Patch operations to Stripe resources
// @Description Translate a JSON-Patch document into one partial-update call per targeted Stripe resource. Only add / replace / remove are supported; move and copy are rejected because Stripe's fields aren't structurally rearrangeable.
// @Tags stripe
// @Security OperationTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param patches formData file true "JSON file containing a JSON-Patch array"
// @Success 200 {object} fiber.Map "Patches applied successfully"
// @Failure 400 {object} fiber.Map "Bad request"
// @Failure 401 {object} fiber.Map "Unauthorized"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /stripe/operation/patch [post]
func (cs *Controllers) OperationPatch(c fiber.Ctx) error {
	operation, ok := c.Locals("operation").(*db.Operation)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid operation type in context",
		})
	}

	// Level-2 execution lock. Without it, two concurrent patch requests
	// against the same operation interleave their Stripe update calls
	// and their operation-log events, and an idempotent retry (e.g.,
	// the caller's retry after a transient 503) can race with the
	// original still-running request. Pull/push already take this lock
	// in connectors/common; patch was the hole.
	//
	// Non-blocking TryLock with defer Unlock matches the push pattern —
	// simpler than the pinned-session WithOperationExecutionLock which
	// pull needs because it holds the lock across zip assembly. Patch's
	// work is short and already transactional per-resource, so a Try
	// that returns 409 on contention is the right shape.
	locked, lockErr := db.TryLockOperationExecution(cs.DB.DB, operation.ID)
	if lockErr != nil {
		cs.Logger.Error(
			"failed to acquire operation execution lock",
			"error", lockErr, "operation_id", operation.ID,
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to acquire operation lock",
		})
	}
	if !locked {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "Operation is already running",
		})
	}
	defer func() {
		if unlockErr := db.UnlockOperationExecution(cs.DB.DB, operation.ID); unlockErr != nil {
			cs.Logger.Error(
				"failed to release operation execution lock",
				"error", unlockErr, "operation_id", operation.ID,
			)
		}
	}()

	common.LogOperationEvent(
		cs.DB, cs.Logger, operation.ID,
		db.LogEventTypeInfo,
		"Stripe patch operation execution started",
		nil,
	)

	stripe, _, _, err := stripeclient.InitFromOperation(cs.Logger, operation)
	if err != nil {
		common.LogOperationEvent(
			cs.DB, cs.Logger, operation.ID,
			db.LogEventTypeError,
			"Failed to initialize Stripe client for patch",
			map[string]any{"error": err.Error()},
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize Stripe client: " + err.Error(),
		})
	}

	patches, err := readPatchesFromForm(c)
	if err != nil {
		common.LogOperationEvent(
			cs.DB, cs.Logger, operation.ID,
			db.LogEventTypeError,
			"Failed to read patches from form",
			map[string]any{"error": err.Error()},
		)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	grouped, err := groupPatchesByResource(patches)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// Sort resource keys so cross-resource apply order is deterministic
	// across retries — otherwise the operation-log event sequence (and
	// the "which resources got updated before an abort" story on partial
	// failure) shuffles with Go's map iteration.
	ctx := c.Context()
	keys := make([]string, 0, len(grouped))
	for k := range grouped {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, key := range keys {
		ops := grouped[key]
		if applyErr := cs.applyResourcePatches(
			ctx, stripe, key, ops, operation,
		); applyErr != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": applyErr.Error(),
			})
		}
	}

	common.LogOperationEvent(
		cs.DB, cs.Logger, operation.ID,
		db.LogEventTypeInfo,
		"Stripe patch operation completed successfully",
		map[string]any{"patch_count": len(patches), "resource_count": len(grouped)},
	)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Patch operations applied successfully",
		"count":   len(patches),
	})
}

// applyResourcePatches coalesces every JSON-Patch op targeting a
// single Stripe resource into one form body and issues one update
// call.
//
// Ordering within the coalesced form:
//   - add / replace use url.Values.Set semantics (last-write-wins per
//     form key). Two ops targeting the same field produce the later
//     value; this matches Stripe's form-parser semantics anyway, and
//     avoids the accumulation bug where the first value leaks through.
//   - remove renders as `key=""` (Stripe's "clear this field" idiom
//     for scalars). Array-index removes are rejected because Stripe
//     doesn't renumber arrays and the JSON-Patch semantic ("remove
//     element 2, renumber 3→2") can't be honored over a partial-
//     update form API.
//
// Cross-resource ordering is handled by the caller via sorted keys;
// intra-resource ordering is the op list order from the patch file.
//
// Idempotency: the client internally composes the Idempotency-Key
// from the form body + the endpoint scope + the pinned Stripe-Version
// (see Client.idempotencyFor) so (a) whitespace-only edits in the
// patch file don't change the key, (b) cross-endpoint writes in the
// same patch don't collide, and (c) bumping Stripe-Version
// invalidates cached responses so clients don't get stale shapes.
func (cs *Controllers) applyResourcePatches(
	ctx context.Context,
	stripe *stripeclient.Client,
	fileKey string,
	ops []irminmodels.PatchOperation,
	operation *db.Operation,
) error {
	parsed, err := stripeclient.ParsePath(fileKey)
	if err != nil {
		return fmt.Errorf("patch: %w", err)
	}
	if !parsed.Resource.Write {
		return fmt.Errorf("patch: resource %q is read-only", parsed.Resource.Name)
	}
	if parsed.IsNew || parsed.ID == "" {
		return fmt.Errorf(
			"patch: path %q is a create target; use push instead of patch",
			fileKey,
		)
	}

	form := url.Values{}
	for _, op := range ops {
		fieldPath, innerErr := trimFilePrefix(op.Path, fileKey)
		if innerErr != nil {
			return innerErr
		}
		if fieldPath == "" {
			return errors.New("patch: cannot replace an entire resource via patch; use push")
		}
		if err = applySingleOp(op, fieldPath, form); err != nil {
			return err
		}
	}

	scope := parsed.Resource.Path + "/" + parsed.ID
	_, err = stripe.Update(ctx, parsed.Resource.Path, parsed.ID, scope, form)
	if err != nil {
		common.LogOperationEvent(
			cs.DB, cs.Logger, operation.ID,
			db.LogEventTypeError,
			"Stripe patch update failed",
			map[string]any{
				"resource": parsed.Resource.Name,
				"id":       parsed.ID,
				"error":    err.Error(),
			},
		)
		return fmt.Errorf(
			"patch: update %s/%s: %w",
			parsed.Resource.Name, parsed.ID, err,
		)
	}

	common.LogOperationEvent(
		cs.DB, cs.Logger, operation.ID,
		db.LogEventTypeInfo,
		"Stripe patch update succeeded",
		map[string]any{
			"resource":  parsed.Resource.Name,
			"id":        parsed.ID,
			"op_count":  len(ops),
			"form_keys": len(form),
		},
	)
	return nil
}

// readPatchesFromForm reads the uploaded JSON-Patch file out of the
// multipart body and decodes it. Returns the raw bytes too because
// they feed the Idempotency-Key derivation — re-running the same
// patch with the same inputs is deduped by Stripe.
// maxPatchFileBytes caps the size of the uploaded JSON-Patch file
// read into memory before unmarshal. The global Fiber BodyLimit is
// 5 GB (needed for bulk pushes on other connectors), which would let
// a caller OOM the connector process by posting a multi-gigabyte
// `patches` upload. A JSON-Patch document with 10k ops is on the
// order of 1 MB; 4 MB is a comfortable ceiling. The local cap keeps
// patch-specific DoS exposure in the handler that can reason about
// it, rather than relying on a global limit set for another purpose.
const maxPatchFileBytes = 4 * 1024 * 1024

func readPatchesFromForm(c fiber.Ctx) ([]irminmodels.PatchOperation, error) {
	fh, err := c.FormFile("patches")
	if errors.Is(err, http.ErrMissingFile) {
		return nil, errors.New("no JSON patch file uploaded (form field 'patches')")
	}
	if err != nil {
		return nil, fmt.Errorf("retrieve form file: %w", err)
	}
	file, err := fh.Open()
	if err != nil {
		return nil, fmt.Errorf("open form file: %w", err)
	}
	defer func() { _ = file.Close() }()

	// io.LimitReader caps input; ReadAll then checks the +1 boundary
	// so we distinguish "exactly at cap" from "caller sent more".
	body, err := io.ReadAll(io.LimitReader(file, maxPatchFileBytes+1))
	if err != nil {
		return nil, fmt.Errorf("read patch file: %w", err)
	}
	if int64(len(body)) > maxPatchFileBytes {
		return nil, fmt.Errorf(
			"patch file exceeds %d-byte cap; split into smaller patch uploads",
			maxPatchFileBytes,
		)
	}

	var patches []irminmodels.PatchOperation
	if jsonErr := json.Unmarshal(body, &patches); jsonErr != nil {
		return nil, fmt.Errorf("parse JSON-Patch: %w", jsonErr)
	}
	return patches, nil
}

// groupPatchesByResource buckets each op by the file-path prefix of
// its JSON-Pointer. All ops with path `/customers/cus_abc.json/...`
// fold into a single Stripe update call on cus_abc.
func groupPatchesByResource(
	patches []irminmodels.PatchOperation,
) (map[string][]irminmodels.PatchOperation, error) {
	out := make(map[string][]irminmodels.PatchOperation)
	for i, op := range patches {
		fileKey, err := extractFileKey(op.Path)
		if err != nil {
			return nil, fmt.Errorf("patch[%d]: %w", i, err)
		}
		out[fileKey] = append(out[fileKey], op)
	}
	return out, nil
}

// extractFileKey peels the `<resource>/<id>.json` prefix off a
// JSON-Pointer path. Rejects pointers that don't land on a known
// resource file.
//
// Boundary is strict: the `.json` segment must be followed by either
// a `/` (field pointer, e.g., `/customers/cus_abc.json/email`) or
// end of string (whole-file pointer, rejected upstream). An earlier
// revision used `strings.Index(trimmed, ".json")` which would accept
// `customers/cus_abc.jsonEVIL/email` and silently produce a field
// path of `EVIL[email]` — Stripe ignored it, but the parser
// accepting malformed input was a bug.
func extractFileKey(pointer string) (string, error) {
	trimmed := strings.TrimPrefix(pointer, "/")
	const jsonExt = ".json"
	// Common case: a field pointer like `<file>.json/<field>`. The
	// delimiter after `.json` must be a `/` to count as a file-key
	// boundary, not just a substring.
	if idx := strings.Index(trimmed, jsonExt+"/"); idx >= 0 {
		return trimmed[:idx+len(jsonExt)], nil
	}
	// Rare case: the pointer targets the file itself with no field
	// suffix. Caller (applyResourcePatches) rejects this as a
	// whole-resource replacement, but extractFileKey returns the
	// well-formed key rather than erroring so the caller can emit a
	// more specific error.
	if strings.HasSuffix(trimmed, jsonExt) {
		return trimmed, nil
	}
	return "", fmt.Errorf(
		"patch path %q must reference a <resource>/<id>.json file",
		pointer,
	)
}

// trimFilePrefix removes the file-path prefix from a JSON-Pointer,
// returning just the field-path component (e.g., `email` or
// `metadata/plan`). Returns "" when the pointer is exactly the file
// key (which is a whole-resource replacement — rejected upstream).
func trimFilePrefix(pointer, fileKey string) (string, error) {
	trimmed := strings.TrimPrefix(pointer, "/")
	if !strings.HasPrefix(trimmed, fileKey) {
		return "", fmt.Errorf(
			"patch path %q does not start with file key %q",
			pointer, fileKey,
		)
	}
	rest := strings.TrimPrefix(trimmed, fileKey)
	rest = strings.TrimPrefix(rest, "/")
	return rest, nil
}

// jsonPointerToFormKey converts a JSON-Pointer field suffix
// ("metadata/plan" or "items/0/price") into Stripe's form key
// convention ("metadata[plan]" or "items[0][price]"). Unescaping
// handles `~1` → `/` and `~0` → `~` per RFC 6901.
func jsonPointerToFormKey(ptr string) string {
	parts := strings.Split(ptr, "/")
	for i, p := range parts {
		p = strings.ReplaceAll(p, "~1", "/")
		p = strings.ReplaceAll(p, "~0", "~")
		parts[i] = p
	}
	if len(parts) == 0 {
		return ""
	}
	head := parts[0]
	var sb strings.Builder
	sb.WriteString(head)
	for _, p := range parts[1:] {
		sb.WriteByte('[')
		sb.WriteString(p)
		sb.WriteByte(']')
	}
	return sb.String()
}

// applySingleOp applies one JSON-Patch op to the coalesced form.
// Split out of applyResourcePatches to keep the inner loop readable
// and give the op-by-op branches a clean unit-test surface.
func applySingleOp(op irminmodels.PatchOperation, fieldPath string, form url.Values) error {
	formKey := jsonPointerToFormKey(fieldPath)
	switch op.Op {
	case "add", "replace":
		if op.Value == nil {
			return fmt.Errorf("patch: op %q requires a value", op.Op)
		}
		// JSON null as the value ("replace": {"path":"/name","value":null})
		// is a valid JSON-Patch payload meaning "clear this field". Route
		// it through the same scalar-clear path `remove` uses rather than
		// letting it fall into setValueInForm, which would render it as
		// {"key":null} — JSONToForm skips nulls, produces an empty form,
		// and the user gets "refusing to send an empty payload" instead
		// of a clear field-clear.
		if *op.Value == nil {
			if isArrayIndexPath(fieldPath) {
				return fmt.Errorf(
					"patch: op %q with null value on array element %q is not supported: "+
						"Stripe doesn't renumber arrays, so clearing a single element "+
						"can't be honored; replace the whole array instead",
					op.Op, op.Path,
				)
			}
			// Stripe's "clear this field" idiom for scalars — same as
			// the remove case below.
			form.Set(formKey, "")
			return nil
		}
		if err := setValueInForm(formKey, *op.Value, form); err != nil {
			return fmt.Errorf("patch: encode %s: %w", op.Path, err)
		}
		return nil
	case "remove":
		if isArrayIndexPath(fieldPath) {
			return fmt.Errorf(
				"patch: op %q on array element %q is not supported: "+
					"Stripe doesn't renumber arrays, so JSON-Patch remove "+
					"semantics can't be honored; replace the whole array instead",
				op.Op, op.Path,
			)
		}
		// Stripe's "clear this field" idiom for scalars.
		form.Set(formKey, "")
		return nil
	case "move", "copy":
		return fmt.Errorf("patch: op %q is not supported for Stripe resources", op.Op)
	default:
		return fmt.Errorf("patch: unsupported op %q", op.Op)
	}
}

// isArrayIndexPath reports whether any segment of the JSON-Pointer
// field path is a pure integer — which in JSON-Patch semantics means
// "array element at this index". Stripe's form API can't handle
// remove-by-index because it doesn't renumber arrays on partial
// update; we reject these up front instead of pretending.
func isArrayIndexPath(fieldPath string) bool {
	for _, seg := range strings.Split(fieldPath, "/") {
		if seg == "" {
			continue
		}
		isAllDigits := true
		for _, r := range seg {
			if r < '0' || r > '9' {
				isAllDigits = false
				break
			}
		}
		if isAllDigits {
			return true
		}
	}
	return false
}

// setValueInForm writes a JSON value into the form under the given
// key, using last-write-wins semantics (url.Values.Set) for scalar
// fields and bracketed child keys for objects/arrays. Swallowed
// errors were a prior-round bug; marshal/flatten failures now
// propagate so the caller aborts the patch and the user doesn't see
// a misleading "patch applied" message while Stripe got nothing.
func setValueInForm(key string, value any, out url.Values) error {
	return appendValueToForm(key, value, out)
}

// appendValueToForm encodes a JSON value into the form under the
// given key and returns an error if the value can't be marshaled or
// flattened. Errors propagate (rather than being swallowed) so the
// caller can abort the patch — silently dropping a malformed field
// while letting the Stripe update succeed would leave the user with
// a "patch applied" message and a field change that never happened.
//
// For scalar values, writes one form entry at key. For object/array
// values, the key becomes a bracketed prefix: passing key="metadata"
// with value {"plan":"pro","region":"eu"} emits metadata[plan]=pro
// and metadata[region]=eu. Matches the bracketed convention
// JSONToForm uses on the push path so patch + push stay semantically
// aligned.
func appendValueToForm(key string, value any, out url.Values) error {
	// Re-marshal the single value to JSON and flatten under the
	// target key. Not the fastest path, but the values are small
	// and this keeps the encoding centralized in JSONToForm.
	buf, err := json.Marshal(map[string]any{key: value})
	if err != nil {
		return fmt.Errorf("marshal value for key %q: %w", key, err)
	}
	form, err := stripeclient.JSONToForm(buf)
	if err != nil {
		return fmt.Errorf("flatten value for key %q: %w", key, err)
	}
	// Last-write-wins on each form key. Earlier revisions appended,
	// which meant two ops targeting the same scalar field produced
	// multi-value form entries — url.Values.Encode emits both and
	// Stripe's parser picks whichever comes last, but the ambiguity
	// isn't worth the accumulation. Direct assignment matches
	// Stripe's form-parser semantics cleanly.
	for k, v := range form {
		out[k] = v
	}
	return nil
}
