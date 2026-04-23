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
