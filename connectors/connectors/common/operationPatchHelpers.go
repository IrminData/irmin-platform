// operationPatchHelpers.go hosts the JSON-Patch parsing utilities
// every vendor connector that bypasses HandleOperationPatch reuses.
// The handler in common/operationPatch.go fits SQL-shaped connectors
// where each op maps to a (table, row, column) tuple; vendor
// connectors with richer write surfaces (Stripe, Linear, …) prefer
// to coalesce ops by file path and issue one update call per record,
// which means each one needs the same upload-read + path-split
// helpers. They lived as duplicates in stripe/ and linear/ until
// this refactor; bug fixes had to be applied twice.

package common

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/gofiber/fiber/v3"
)

// MaxPatchFileBytes caps the size of an uploaded JSON-Patch document
// read into memory before unmarshal. The global Fiber BodyLimit is
// 5 GB (sized for bulk pushes on other connectors), which would let a
// caller OOM the connector process by posting a multi-gigabyte
// `patches` upload. A JSON-Patch document with 10 000 ops weighs in
// at ~1 MB; 4 MB is a comfortable ceiling. Patch handlers that need
// a different cap can read the upload themselves.
const MaxPatchFileBytes = 4 * 1024 * 1024

// ReadPatchesFromForm reads the `patches` form-file out of the
// inbound multipart body and decodes it into a JSON-Patch slice.
// All filesystem and body reads happen while fiber.Ctx is still
// live so the result is safely usable in a background worker.
//
// Returns an error wrapping http.ErrMissingFile when no `patches`
// field was uploaded; callers map that to a 400.
func ReadPatchesFromForm(c fiber.Ctx) ([]irminmodels.PatchOperation, error) {
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
	body, err := io.ReadAll(io.LimitReader(file, MaxPatchFileBytes+1))
	if err != nil {
		return nil, fmt.Errorf("read patch file: %w", err)
	}
	if int64(len(body)) > MaxPatchFileBytes {
		return nil, fmt.Errorf(
			"patch file exceeds %d-byte cap; split into smaller patch uploads",
			MaxPatchFileBytes,
		)
	}

	var patches []irminmodels.PatchOperation
	if jsonErr := json.Unmarshal(body, &patches); jsonErr != nil {
		return nil, fmt.Errorf("parse JSON-Patch: %w", jsonErr)
	}
	return patches, nil
}

// ExtractPatchFileKey peels the `<resource>/<id>.json` prefix off a
// JSON-Pointer path. Returns the file-key component (without the
// leading slash) so callers can group patch ops by record.
//
// Boundary is strict: the `.json` segment must be followed by either
// a `/` (field pointer, e.g., `/customers/cus_abc.json/email`) or
// end of string (whole-file pointer). An earlier revision used
// `strings.Index(trimmed, ".json")` which would accept
// `customers/cus_abc.jsonEVIL/email` and silently produce a malformed
// field path — fixed once, in this shared helper.
func ExtractPatchFileKey(pointer string) (string, error) {
	trimmed := strings.TrimPrefix(pointer, "/")
	const jsonExt = ".json"
	// Field pointer like `<file>.json/<field>`. The delimiter after
	// `.json` must be a `/` to count as a file-key boundary, not just
	// a substring.
	if idx := strings.Index(trimmed, jsonExt+"/"); idx >= 0 {
		return trimmed[:idx+len(jsonExt)], nil
	}
	// Pointer targets the file itself with no field suffix. Vendor
	// callers typically reject this as a whole-record replace, but we
	// return the well-formed key so the caller can emit a vendor-
	// specific error message.
	if strings.HasSuffix(trimmed, jsonExt) {
		return trimmed, nil
	}
	return "", fmt.Errorf(
		"patch path %q must reference a <resource>/<id>.json file",
		pointer,
	)
}

// TrimPatchFilePrefix removes the file-path prefix from a JSON-
// Pointer and returns just the field-path component (e.g., `email`
// or `metadata/plan`). Returns "" when the pointer is exactly the
// file key — vendor callers reject that case as "whole-record
// replace; use push instead".
func TrimPatchFilePrefix(pointer, fileKey string) (string, error) {
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

// GroupPatchesByFileKey buckets each op by the file-path prefix of
// its JSON-Pointer. All ops on the same `<resource>/<id>.json`
// target fold into a single key, so vendor callers can issue one
// update mutation per record. Errors are returned as
// `patch[<index>]: <reason>` so an operator scanning logs can pin
// the offending entry quickly.
func GroupPatchesByFileKey(
	patches []irminmodels.PatchOperation,
) (map[string][]irminmodels.PatchOperation, error) {
	out := make(map[string][]irminmodels.PatchOperation)
	for i, op := range patches {
		fileKey, err := ExtractPatchFileKey(op.Path)
		if err != nil {
			return nil, fmt.Errorf("patch[%d]: %w", i, err)
		}
		out[fileKey] = append(out[fileKey], op)
	}
	return out, nil
}
