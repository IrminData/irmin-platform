package common

import (
	"context"
	"encoding/json"
	"errors"
	"net"

	sdkmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

// AlreadyRunningErrorMessage is the canonical error message surfaced
// on every 409 "operation is already running" response. Kept as a
// package-level const so the string does not drift across call sites
// — some clients still match against it for backwards compat with
// the pre-envelope wire.
const AlreadyRunningErrorMessage = "Operation is already running"

// RespondAlreadyRunning writes the 409 Conflict response for a
// "operation is already running" collision. Surfaces the existing
// in-flight job's ID + kind + started_at via the SDK's
// AlreadyRunningBody shape so the caller can poll status or cancel
// the blocker without a second round trip.
//
// err is the AlreadyRunningError returned by JobManager.Begin; it
// carries the pre-populated JobID/Kind/OperationID/StartedAt from
// the lookup done inside Begin. Callers should not reach for the
// individual fields — this helper is the only place the wire shape
// is serialised so the shape stays uniform across all connectors.
func RespondAlreadyRunning(c fiber.Ctx, err *AlreadyRunningError) error {
	if err == nil {
		// Defensive: callers should only hit this path when Begin
		// returned a non-nil AlreadyRunningError. If somehow nil,
		// still emit a well-formed 409 so the client sees the
		// canonical shape instead of a crash.
		return c.Status(fiber.StatusConflict).JSON(sdkmodels.AlreadyRunningBody{
			Error: AlreadyRunningErrorMessage,
		})
	}

	body := sdkmodels.AlreadyRunningBody{
		Error:       AlreadyRunningErrorMessage,
		JobID:       err.JobID,
		OperationID: err.OperationID,
		Kind:        err.Kind,
	}
	// StartedAt is *time.Time — nil legally means "no row registered
	// yet" (rare; Begin tries hard to have a row). Copy only when
	// non-zero so the JSON stays clean.
	if !err.StartedAt.IsZero() {
		started := err.StartedAt
		body.StartedAt = &started
	}
	return c.Status(fiber.StatusConflict).JSON(body)
}

// RespondJobError writes a structured error response using the SDK's
// JobErrorBody envelope. The handler is the single place that
// decides status + reason + retryability for failures observed on
// the /operation/{status,result,cancel} endpoints, and this helper
// is the single place those decisions land on the wire.
//
// jobID may be empty when the handler couldn't parse the path
// parameter — the body then omits the field so the caller doesn't
// misread the URL they sent.
func RespondJobError(
	c fiber.Ctx,
	status int,
	reason sdkmodels.JobErrorReason,
	err error,
	jobID string,
) error {
	body := sdkmodels.JobErrorBody{
		Error:     jobErrorMessage(err, reason),
		Reason:    reason,
		Retryable: reasonIsRetryable(reason),
		JobID:     jobID,
	}
	return c.Status(status).JSON(body)
}

// MarkFailedAndRespond is a small helper used by sync handlers
// (push, patch, schema) to collapse the common three-line pattern
// of setting the guard's outcome to failed and returning a
// matching HTTP error into a single call. The caller passes a
// pointer to its in-scope outcome variable so the deferred
// guard.Release picks up the terminal status.
//
// Keeps the handler bodies short enough to satisfy funlen and
// centralises the "outcome reason" string format so all connectors
// emit the same shape in status responses.
func MarkFailedAndRespond(
	c fiber.Ctx,
	outcome *JobOutcome,
	status int,
	stage string,
	err error,
) error {
	*outcome = JobOutcome{
		Status: sdkmodels.OperationJobStatusFailed,
		Error:  stage + ": " + err.Error(),
	}
	return c.Status(status).JSON(fiber.Map{"error": err.Error()})
}

// ClassifyJobReadError maps a DB / IO error observed on a read path
// (GetOperationJob, Snapshot, etc.) to the right (HTTP status,
// JobErrorReason) pair for RespondJobError. Centralised so every
// read path uses the same taxonomy.
//
//   - gorm.ErrRecordNotFound    → 404 + not_found (not retryable)
//   - context.DeadlineExceeded  → 500 + transient_db_error (retryable)
//   - *net.OpError              → 500 + transient_db_error (retryable)
//   - any json.Unmarshal failure (corrupted progress JSON) →
//     500 + corrupted_job_state (not retryable)
//   - anything else             → 500 + internal (not retryable)
func ClassifyJobReadError(err error) (int, sdkmodels.JobErrorReason) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return fiber.StatusNotFound, sdkmodels.JobErrorReasonNotFound
	}
	if errors.Is(err, context.DeadlineExceeded) ||
		errors.Is(err, context.Canceled) {
		return fiber.StatusInternalServerError, sdkmodels.JobErrorReasonTransientDB
	}
	var netErr *net.OpError
	if errors.As(err, &netErr) {
		return fiber.StatusInternalServerError, sdkmodels.JobErrorReasonTransientDB
	}
	var syntaxErr *json.SyntaxError
	if errors.As(err, &syntaxErr) {
		return fiber.StatusInternalServerError, sdkmodels.JobErrorReasonCorruptedRow
	}
	var unmarshalTypeErr *json.UnmarshalTypeError
	if errors.As(err, &unmarshalTypeErr) {
		return fiber.StatusInternalServerError, sdkmodels.JobErrorReasonCorruptedRow
	}
	return fiber.StatusInternalServerError, sdkmodels.JobErrorReasonInternal
}

// jobErrorMessage returns the operator-facing error string for a
// given error + reason. We prefer err.Error() when it's
// non-sensitive and present; otherwise fall back to a canonical
// message keyed off the reason so the body is never "<nil>".
func jobErrorMessage(err error, reason sdkmodels.JobErrorReason) string {
	if err != nil && err.Error() != "" {
		return err.Error()
	}
	switch reason {
	case sdkmodels.JobErrorReasonNotFound:
		return "job not found"
	case sdkmodels.JobErrorReasonTransientDB:
		return "transient database error"
	case sdkmodels.JobErrorReasonCorruptedRow:
		return "job state is corrupted"
	case sdkmodels.JobErrorReasonInvalidRequest:
		return "invalid request"
	case sdkmodels.JobErrorReasonInternal:
		return "internal server error"
	default:
		return "internal server error"
	}
}

// reasonIsRetryable encodes the default retry policy per reason.
// Kept in a single switch so the policy is auditable at a glance.
func reasonIsRetryable(reason sdkmodels.JobErrorReason) bool {
	switch reason {
	case sdkmodels.JobErrorReasonTransientDB:
		return true
	case sdkmodels.JobErrorReasonNotFound,
		sdkmodels.JobErrorReasonCorruptedRow,
		sdkmodels.JobErrorReasonInvalidRequest,
		sdkmodels.JobErrorReasonInternal:
		return false
	default:
		// Unknown reason — treat as non-retryable so clients don't
		// spin on a future code they don't understand.
		return false
	}
}
