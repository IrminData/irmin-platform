package linearcontrollers

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"irmin-connectors/connectors/common"
	linearclient "irmin-connectors/connectors/linear/client"
	"irmin-connectors/db"
	"irmin-connectors/lib"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
	"golang.org/x/sync/errgroup"
)

// patchConcurrency caps in-flight save_issue update calls during a
// patch operation. Same conservative ceiling as pushConcurrency
// (linear/controllers/operationPush.go) — Linear's MCP server doesn't
// document a strict per-mutation rate limit, but unbounded fan-out
// from one patch job risks tripping server-side throttling.
const patchConcurrency = 4

// patchOperationTimeout caps the wall-clock budget for a single patch
// invocation. The patch handler is synchronous (unlike pull/push, which
// hand off to async job workers), so the worker-scoped context comes
// from the inbound HTTP request. We deliberately decouple from the
// request context: a client disconnect (proxy timeout, browser tab
// close) must not interrupt in-flight save_issue calls. Linear has no
// client-supplied idempotency key, so a half-applied patch is harder
// to recover from than one that ran to completion. The timeout keeps
// a wedged session from pinning the worker forever.
//
// 5 minutes covers patchConcurrency=4 against several hundred issues
// at typical Linear API latency (~300ms each); larger patches should
// be split client-side.
const patchOperationTimeout = 5 * time.Minute

// OperationPatch applies a JSON-Patch document to Linear issues. The
// shape mirrors the Stripe patch handler: each patch op's `path`
// starts with the file path of a Linear record (e.g.,
// `/issues/<uuid>.json/title`); the suffix is the field to touch.
// Operations targeting the same issue are coalesced into one
// save_issue tool call so Linear sees a single atomic write per
// issue rather than one call per field.
//
// Only `add`, `replace`, and `remove` are supported — Linear's
// update input is flat enough that JSON-Patch's `move` / `copy`
// don't have well-defined semantics, and silently approximating
// them would mask real bugs in the patch generator.
//
// The handler bypasses common.HandleOperationPatch because that
// helper's per-op `(table, row, column)` model is built for SQL
// connectors and doesn't fit Linear's flat MCP save_issue input
// cleanly. Stripe makes the same choice; see
// stripe/controllers/operationPatch.go for the rationale.
//
// Note: `<id>` in the path must be the Linear UUID (the `id` field
// from a pulled issue), not the human-readable identifier. The
// connector documents this on the patch endpoint so callers reading
// the OpenAPI know which to use.
//
// @Summary Apply JSON-Patch operations to Linear issues
// @Description Translates a JSON-Patch document into one save_issue MCP tool call per targeted Linear issue. Only add/replace/remove are supported. The patch path must reference an issue file (e.g., `/issues/<uuid>.json/title`) where `<uuid>` is the Linear UUID, not the identifier (IRM-42).
// @Tags linear
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param patches formData file true "JSON file containing a JSON-Patch array"
// @Success 200 {object} fiber.Map "Patches applied successfully"
// @Failure 400 {object} fiber.Map "Bad request"
// @Failure 401 {object} fiber.Map "Unauthorized"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /linear/operation/patch [post]
func (cs *Controllers) OperationPatch(c fiber.Ctx) (retErr error) {
	manager, managerOK := cs.App.JobManager.(*common.JobManager)
	if !managerOK || manager == nil {
		return common.RespondJobError(
			c, fiber.StatusInternalServerError,
			irminmodels.JobErrorReasonInternal,
			errors.New("job manager not configured"), "",
		)
	}

	operation, ok := c.Locals("operation").(*db.Operation)
	if !ok {
		return common.RespondJobError(
			c, fiber.StatusInternalServerError,
			irminmodels.JobErrorReasonInternal,
			errors.New("invalid operation type in context"), "",
		)
	}

	connectionID, headerErr := lib.ConnectionIDFromRequestHeader(func(k string) string { return c.Get(k) })
	if headerErr != nil {
		return cs.WriteResolveError(c, headerErr)
	}

	guard, alreadyErr, beginErr := manager.Begin(common.BeginOperationJobInput{
		OperationID:             operation.ID,
		ConnectorRegistrationID: operation.ConnectorRegistrationID,
		ConnectorName:           "linear",
		Kind:                    "patch",
	})
	if alreadyErr != nil {
		return common.RespondAlreadyRunning(c, alreadyErr)
	}
	if beginErr != nil {
		cs.Logger.Error("failed to acquire operation execution lock",
			"error", beginErr, "operation_id", operation.ID)
		return common.RespondJobError(
			c, fiber.StatusInternalServerError,
			irminmodels.JobErrorReasonTransientDB,
			beginErr, "",
		)
	}

	outcome := common.JobOutcome{
		Status: irminmodels.OperationJobStatusFailed,
		Error:  "handler exited without setting outcome",
	}
	defer func() {
		// Same panic-recovery pattern as the Stripe patch handler.
		// See operationPush.go's recovery block in common/ for the
		// rationale on overwriting retErr with a structured 500.
		if r := recover(); r != nil {
			cs.Logger.Error("linear patch panic recovered",
				"error", fmt.Sprintf("%v", r), "operation_id", operation.ID)
			outcome = common.JobOutcome{
				Status: irminmodels.OperationJobStatusFailed,
				Error:  fmt.Sprintf("handler panic: %v", r),
			}
			retErr = common.RespondJobError(
				c, fiber.StatusInternalServerError,
				irminmodels.JobErrorReasonInternal,
				fmt.Errorf("handler panic: %v", r),
				guard.JobID(),
			)
		}
		guard.Release(outcome)
	}()

	patches, err := common.ReadPatchesFromForm(c)
	if err != nil {
		outcome = common.JobOutcome{
			Status: irminmodels.OperationJobStatusFailed,
			Error:  "read patches: " + err.Error(),
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	grouped, groupErr := common.GroupPatchesByFileKey(patches)
	if groupErr != nil {
		outcome = common.JobOutcome{
			Status: irminmodels.OperationJobStatusFailed,
			Error:  "group patches: " + groupErr.Error(),
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": groupErr.Error()})
	}

	// Decouple the operation lifecycle from the inbound HTTP request.
	// Fiber/fasthttp's c.Context() cancels the moment the client
	// disconnects (proxy timeout, browser tab close). With the bounded
	// concurrency fan-out below that cancellation would abort in-flight
	// save_issue calls mid-write — Linear has no client-supplied
	// idempotency key, so a half-applied patch is harder to recover
	// from than one that ran to completion. context.WithoutCancel
	// (Go 1.21+) preserves request-scoped values like deadlines from
	// upstream middleware while severing the cancel signal, then
	// patchOperationTimeout bounds the worker against a wedged session.
	opCtx, opCancel := context.WithTimeout(
		context.WithoutCancel(c.Context()), patchOperationTimeout,
	)
	defer opCancel()

	client, cleanup, status, sessionErr := cs.openPatchSession(opCtx, operation, connectionID)
	if sessionErr != nil {
		outcome = common.JobOutcome{
			Status: irminmodels.OperationJobStatusFailed,
			Error:  sessionErr.Error(),
		}
		return c.Status(status).JSON(fiber.Map{"error": sessionErr.Error()})
	}
	defer cleanup()

	if applyErr := cs.applyAllPatches(opCtx, client, grouped, operation); applyErr != nil {
		outcome = common.JobOutcome{
			Status: irminmodels.OperationJobStatusFailed,
			Error:  "apply patches: " + applyErr.Error(),
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": applyErr.Error(),
		})
	}

	cs.logPatchEvent(operation, db.LogEventTypeInfo,
		"Linear patch operation completed successfully",
		map[string]any{"patch_count": len(patches), "issue_count": len(grouped)},
	)

	outcome = common.JobOutcome{Status: irminmodels.OperationJobStatusComplete}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Patch operations applied successfully",
		"count":   len(patches),
	})
}

// applyAllPatches fans the per-issue update calls out across a
// bounded worker pool. Sorted entry into the pool keeps the apply
// order stable (in-pool order; emitted events are still time-ordered).
// Extracted from OperationPatch so that handler stays under the funlen
// cap while keeping the concurrency policy in one place.
func (cs *Controllers) applyAllPatches(
	ctx context.Context,
	client *linearclient.Client,
	grouped map[string][]irminmodels.PatchOperation,
	operation *db.Operation,
) error {
	keys := make([]string, 0, len(grouped))
	for k := range grouped {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	g, gctx := errgroup.WithContext(ctx)
	g.SetLimit(patchConcurrency)
	for _, fileKey := range keys {
		ops := grouped[fileKey]
		g.Go(func() error {
			return cs.applyIssuePatches(gctx, client, fileKey, ops, operation)
		})
	}
	return g.Wait()
}

// openPatchSession resolves the connector endpoint, opens an MCP
// session against it, and returns the live client + cleanup func.
// Extracted from OperationPatch to keep that handler under the
// funlen cap. The returned status is the HTTP status the caller
// should reply with on error (400 for endpoint validation, 500 for
// session-open failure); err is non-nil only when status is 4xx/5xx.
func (cs *Controllers) openPatchSession(
	ctx context.Context,
	operation *db.Operation,
	connectionID uint,
) (*linearclient.Client, func(), int, error) {
	endpoint, endpointErr := resolveEndpointForOperation(operation)
	if endpointErr != nil {
		return nil, nil, fiber.StatusBadRequest,
			fmt.Errorf("resolve mcp_endpoint: %w", endpointErr)
	}
	client, cleanup, sessionErr := linearclient.OpenSession(
		ctx, endpoint, cs.OAuthConnector.TokenClient, connectionID, newOAuthHTTPClient(), cs.Logger,
	)
	if sessionErr != nil {
		return nil, nil, fiber.StatusInternalServerError,
			fmt.Errorf("open MCP session: %w", sessionErr)
	}
	return client, cleanup, fiber.StatusOK, nil
}

// applyIssuePatches collapses every JSON-Patch op targeting one
// issue into a single IssueUpdate mutation. This keeps Linear's
// audit log clean (one update event per issue) and reduces the
// number of mutations counted against rate limits.
func (cs *Controllers) applyIssuePatches(
	ctx context.Context,
	client *linearclient.Client,
	fileKey string,
	ops []irminmodels.PatchOperation,
	operation *db.Operation,
) error {
	parsed, err := linearclient.ParsePath(fileKey)
	if err != nil {
		return fmt.Errorf("patch: %w", err)
	}
	if !parsed.Resource.Patch {
		return fmt.Errorf("patch: resource %q is not patch-enabled", parsed.Resource.Name)
	}
	if parsed.IsNew || parsed.ID == "" {
		return fmt.Errorf(
			"patch: path %q is not a single existing record; use push for create",
			fileKey,
		)
	}

	input := map[string]any{}
	for _, op := range ops {
		field, fieldErr := common.TrimPatchFilePrefix(op.Path, fileKey)
		if fieldErr != nil {
			return fieldErr
		}
		if field == "" {
			return errors.New(
				"patch: cannot replace an entire issue via patch; use push for create or supply a field path",
			)
		}
		if applyErr := applyOpToInput(op, field, input); applyErr != nil {
			return applyErr
		}
	}

	if len(input) == 0 {
		// Every op was a no-op (e.g., remove on already-empty); nothing
		// to do but still log so the operator sees the patch ran.
		cs.logPatchEvent(operation, db.LogEventTypeInfo,
			"Linear patch produced no field changes",
			map[string]any{"id": parsed.ID, "op_count": len(ops)},
		)
		return nil
	}

	updated, updateErr := client.IssueUpdate(ctx, parsed.ID, input)
	if updateErr != nil {
		cs.logPatchEvent(operation, db.LogEventTypeError,
			"Linear issueUpdate failed",
			map[string]any{"id": parsed.ID, "error": updateErr.Error()},
		)
		return fmt.Errorf("patch: update %s: %w", parsed.ID, updateErr)
	}
	cs.logPatchEvent(operation, db.LogEventTypeInfo,
		"Linear issueUpdate succeeded",
		map[string]any{
			"id":       updated.ID,
			"op_count": len(ops),
			"fields":   keys(input),
		},
	)
	return nil
}

// logPatchEvent is the nil-safe wrapper around common.LogOperationEvent
// for the patch handler. Mirrors the pattern operationPull.go and
// operationPush.go use — common.LogOperationEvent panics on a nil
// dbInstance, so guarding here keeps unit tests (which construct a
// bare *Controllers without a DB) from crashing on the success path.
func (cs *Controllers) logPatchEvent(
	operation *db.Operation, evt db.LogEventType, msg string, payload map[string]any,
) {
	if operation == nil || cs.DB == nil || cs.Logger == nil {
		return
	}
	common.LogOperationEvent(cs.DB, cs.Logger, operation.ID, evt, msg, payload)
}

// applyOpToInput maps one JSON-Patch op onto Linear's flat
// IssueUpdateInput shape. Nested field paths are rejected — Linear's
// inputs are intentionally flat (`title`, `description`, `priority`,
// `assigneeId`, …) and a nested patch path almost certainly indicates
// a confused patch generator we shouldn't paper over.
func applyOpToInput(op irminmodels.PatchOperation, field string, input map[string]any) error {
	if strings.Contains(field, "/") {
		return fmt.Errorf(
			"patch: nested field path %q is not supported (Linear's save_issue input is flat); "+
				"target the top-level field directly",
			field,
		)
	}
	switch op.Op {
	case "add", "replace":
		if op.Value == nil {
			return fmt.Errorf("patch: op %q requires a value", op.Op)
		}
		// `op.Value` is `*any` — the JSON decoder already turned the
		// patch's `value` into a Go value (string, float64, bool,
		// map, slice, or nil). Store it directly; the MCP CallTool
		// args map carries it through as-is. A literal `null` value
		// is dereferenced to a nil `any`, which Linear treats as
		// "clear this field" for clearable fields — same behavior
		// as the explicit `remove` op.
		input[field] = *op.Value
		return nil
	case "remove":
		// Linear treats null as "clear" for nullable fields. For
		// non-nullable scalars (e.g., title) Linear will reject the
		// call, which surfaces as an MCP tool error — clearer than
		// silently mapping `remove` to an empty string.
		input[field] = nil
		return nil
	case "move", "copy":
		return fmt.Errorf("patch: op %q is not supported for Linear issues", op.Op)
	default:
		return fmt.Errorf("patch: unsupported op %q", op.Op)
	}
}

// keys returns the input map's keys, sorted, so log payloads are
// deterministic across retries (Go map iteration is randomized).
func keys(m map[string]any) []string {
	out := make([]string, 0, len(m))
	for k := range m {
		out = append(out, k)
	}
	sort.Strings(out)
	return out
}
