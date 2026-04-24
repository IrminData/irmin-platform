package connectorsclient

import (
	"errors"
	"fmt"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// APIError is returned when the connector service responds with an
// unexpected HTTP status code. Callers can inspect StatusCode and
// Body for diagnostics, or use errors.As to unwrap it from wrapped
// errors.
type APIError struct {
	// StatusCode is the HTTP status returned by the connector.
	StatusCode int
	// Body is the response body (may be JSON, may be plain text)
	// captured verbatim for diagnostics.
	Body string
}

// Error implements the error interface.
func (e *APIError) Error() string {
	return fmt.Sprintf(
		"connector API request failed with status %d. Body: %s",
		e.StatusCode,
		e.Body,
	)
}

// ErrLegacySyncPullResponse is returned by StartOperationPull when
// the connector service responds with a 200 OK + zip body instead of
// the expected 202 Accepted + {job_id}. Its presence means the
// connector service is still on the pre-async protocol and the
// caller is talking to an unmigrated deployment; the Core poll
// wrapper should bail out with an actionable message rather than
// attempt a silent fallback, per the "no backward-compat shim"
// decision in the async-pull plan.
var ErrLegacySyncPullResponse = errors.New(
	"connector returned legacy synchronous pull response (HTTP 200 with body); " +
		"expected 202 Accepted from async protocol — upgrade the connector service",
)

// ErrResultNotReady is returned by FetchOperationResult when the job
// is still in a non-terminal state (pending or running) at the time
// of the fetch. The Core poll wrapper should only call
// FetchOperationResult after observing status=complete; this error
// surfaces a protocol mistake rather than a transient condition and
// is not safe to retry without polling status again.
var ErrResultNotReady = errors.New(
	"operation result is not ready: job has not reached terminal status=complete",
)

// ErrJobFailed is returned when a status response indicates the job
// has reached a non-success terminal state (failed or cancelled).
// Callers that wrap this can surface the original connector-supplied
// error message from OperationJobStatusResponse.Error.
var ErrJobFailed = errors.New("operation job ended in a non-success terminal state")

// JobFailedError wraps ErrJobFailed with the terminal status and the
// connector-supplied error message, so callers that wish to act on
// cancelled vs. failed can discriminate without re-reading the
// status response.
type JobFailedError struct {
	// Status is the terminal status observed. Always
	// OperationJobStatusFailed or OperationJobStatusCancelled.
	Status irminmodels.OperationJobStatus
	// Message is the operator-facing error message from the status
	// response. May be empty for cancellations.
	Message string
}

// Error implements the error interface.
func (e *JobFailedError) Error() string {
	if e.Message == "" {
		return fmt.Sprintf("operation job ended with status=%s", e.Status)
	}
	return fmt.Sprintf("operation job ended with status=%s: %s", e.Status, e.Message)
}

// Unwrap lets errors.Is(err, ErrJobFailed) succeed on wrapped
// JobFailedError values, so callers can check the sentinel and then
// use errors.As to extract the detail.
func (e *JobFailedError) Unwrap() error {
	return ErrJobFailed
}

// ErrOperationAlreadyRunning is the sentinel returned when a
// connector refuses a request because the same operation is already
// in flight (HTTP 409). Callers wrap this with AlreadyRunningError
// to surface the job_id of the blocker; use errors.As to unwrap.
var ErrOperationAlreadyRunning = errors.New(
	"connector refused the request: operation is already running",
)

// AlreadyRunningError wraps ErrOperationAlreadyRunning with the
// details of the currently-running job so callers can redirect their
// polling (or issue a cancel) without a second round-trip to the
// server to discover what's holding the lock.
//
// Returned by StartOperationPull (and any other op-start path that
// migrates onto the async protocol) when the server responds with
// HTTP 409 + an AlreadyRunningBody payload.
type AlreadyRunningError struct {
	// Body is the full structured payload the server returned. JobID
	// is the most useful field for callers, but Kind / StartedAt /
	// OperationID are kept for logs and operator diagnostics.
	Body irminmodels.AlreadyRunningBody
}

// Error implements the error interface.
func (e *AlreadyRunningError) Error() string {
	if e.Body.JobID == "" {
		// Legacy holder without a registered job row. Callers
		// shouldn't try to cancel by job_id; the retry-later hint is
		// the best we can give.
		return "operation is already running (no job_id available; retry later)"
	}
	return fmt.Sprintf(
		"operation is already running (job_id=%s, kind=%s)",
		e.Body.JobID, e.Body.Kind,
	)
}

// Unwrap lets errors.Is(err, ErrOperationAlreadyRunning) succeed on
// wrapped AlreadyRunningError values, matching the pattern used by
// JobFailedError.
func (e *AlreadyRunningError) Unwrap() error {
	return ErrOperationAlreadyRunning
}

// JobID is a convenience accessor for the most commonly consumed
// field so callers don't have to reach through Body every time.
func (e *AlreadyRunningError) JobID() string {
	return e.Body.JobID
}

// JobServerError wraps a structured JobErrorBody returned by the
// async-job endpoints (status/result/cancel) on any non-2xx
// response. Callers driving retry logic should inspect Retryable
// and Reason rather than the raw Error string.
//
// Returned by GetOperationJobStatus, FetchOperationResult, and
// CancelOperationJob when the server responds with a structured
// JobErrorBody payload. For older servers that still return the
// unstructured {"error": "..."} shape, the client falls back to
// APIError so this type only surfaces on migrated deployments.
type JobServerError struct {
	// StatusCode is the HTTP status returned by the connector. Kept
	// separately from Body so callers can discriminate 404 vs 500
	// without re-parsing the reason code.
	StatusCode int

	// Body is the structured error envelope. Reason and Retryable
	// are the machine-readable signals; Error carries the
	// operator-facing message.
	Body irminmodels.JobErrorBody
}

// Error implements the error interface.
func (e *JobServerError) Error() string {
	return fmt.Sprintf(
		"connector job endpoint returned status %d (reason=%s, retryable=%t): %s",
		e.StatusCode, e.Body.Reason, e.Body.Retryable, e.Body.Error,
	)
}

// Retryable reports whether the server classified this failure as
// safe to retry after a short backoff.
func (e *JobServerError) Retryable() bool {
	return e.Body.Retryable
}

// Reason returns the machine-readable failure classification.
func (e *JobServerError) Reason() irminmodels.JobErrorReason {
	return e.Body.Reason
}
