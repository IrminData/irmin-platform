package irminmodels

import (
	"time"

	"github.com/IrminData/irmin-sdk-go/observability"
)

// OperationJobStatus enumerates the lifecycle states of an asynchronous
// connector operation job (e.g., a long-running pull).
//
// The wire-format string values are stable across service boundaries:
// irmin-connectors emits these values on /operation/status and the
// Core poll wrapper compares against them directly. Treat a rename
// here as a breaking change for every consumer at once.
type OperationJobStatus string

const (
	// OperationJobStatusPending means the job has been accepted but
	// its worker has not yet started. Short-lived state; most consumers
	// can fold it into "running" for UX purposes.
	OperationJobStatusPending OperationJobStatus = "pending"

	// OperationJobStatusRunning means the worker goroutine is actively
	// producing output (paginating an API, scanning rows, building
	// the result archive, etc.). Progress events on the status
	// response correspond to this phase.
	OperationJobStatusRunning OperationJobStatus = "running"

	// OperationJobStatusComplete means the worker finished
	// successfully and the result is ready to fetch via
	// /operation/result/:job_id. Terminal.
	OperationJobStatusComplete OperationJobStatus = "complete"

	// OperationJobStatusFailed means the worker hit an unrecoverable
	// error and will not produce a result. The error message is
	// surfaced on the status response. Terminal.
	OperationJobStatusFailed OperationJobStatus = "failed"

	// OperationJobStatusCancelled means the job was cancelled before
	// it could finish, either by an explicit /operation/cancel call
	// or by the connector service shutting the job down (e.g., TTL
	// expiry, pod shutdown). Terminal.
	OperationJobStatusCancelled OperationJobStatus = "cancelled"
)

// IsTerminal reports whether a status is a terminal state (no further
// transitions). Useful for the Core poll loop's exit condition.
func (s OperationJobStatus) IsTerminal() bool {
	switch s {
	case OperationJobStatusComplete,
		OperationJobStatusFailed,
		OperationJobStatusCancelled:
		return true
	case OperationJobStatusPending, OperationJobStatusRunning:
		return false
	default:
		return false
	}
}

// OperationJob is the metadata record for an asynchronous connector
// operation (currently: pull; push/patch to follow).
//
// The connector service creates one of these on POST /operation/pull,
// returns its ID to the caller, then fills in status/progress as the
// worker runs. The full job payload is typically only returned inside
// status responses; POST /operation/pull itself returns the slimmer
// StartOperationPullResponse to keep the accept-fast path fast.
type OperationJob struct {
	// JobID is the connector-service-issued identifier for this job.
	// Opaque to clients — used to poll status, fetch result, or
	// cancel.
	JobID string `json:"job_id" example:"opjob_9m3x7k2n8q5p"`

	// ConnectorID is the SQID of the connector plugin that owns this
	// job (e.g., Stripe, Pinecone, Postgres). Present so poll
	// consumers can disambiguate when the same core process runs
	// multiple pulls in parallel.
	ConnectorID string `json:"connector_id" example:"conn_5p8q2n7m9x4k"`

	// OperationID is the connector-side operation token / numeric
	// identifier this job is executing against. Maps to the
	// Operation record created via /operation/init.
	OperationID string `json:"operation_id" example:"42"`

	// Status is the current lifecycle state. See OperationJobStatus.
	Status OperationJobStatus `json:"status" example:"running"`

	// CreatedAt is the UTC time the job was accepted by the
	// connector service.
	CreatedAt time.Time `json:"created_at"`

	// ExpiresAt is when the result, if any, will be garbage-collected
	// by the connector service's janitor. After this point a
	// /operation/result call is not guaranteed to succeed even for
	// jobs that reached status=complete. nil means no TTL.
	//
	// Pointer rather than time.Time + omitempty because encoding/json's
	// omitempty does not treat a zero time.Time as empty — it would
	// serialise as "0001-01-01T00:00:00Z" on the wire. Matches the
	// *time.Time convention used elsewhere in this SDK's models.
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

// OperationJobStatusResponse is the body returned by
// GET /operation/status/:job_id. It carries the current status plus
// any observability events accumulated since job start, so the
// console can surface per-page / per-batch / rate-limit progress
// without opening a separate stream.
//
// Progress events are cumulative — the connector service appends to
// the slice as work proceeds. Clients polling every ~5s can diff
// Progress against what they've already displayed, or simply replace.
type OperationJobStatusResponse struct {
	// JobID echoes the ID from the URL so callers receiving a batch
	// of responses (or logs) can associate the body with its job
	// without re-parsing the request.
	JobID string `json:"job_id" example:"opjob_9m3x7k2n8q5p"`

	// Status is the current lifecycle state at the time of the
	// response. Callers should stop polling once this becomes
	// terminal (see OperationJobStatus.IsTerminal).
	Status OperationJobStatus `json:"status" example:"running"`

	// Progress is the cumulative slice of observability events the
	// connector worker has emitted so far. Uses the shared
	// observability.ProgressEvent vocabulary, so a "page" or
	// "rate_limit" event means the same thing here as it does in
	// Core workflow logs or AI stream events.
	//
	// May be empty for short-lived jobs that finish before any
	// event is emitted.
	Progress []observability.ProgressEvent `json:"progress,omitempty"`

	// Error is populated when Status is OperationJobStatusFailed.
	// Operator-facing message; not a machine-readable code. Empty
	// for any non-failed status.
	Error string `json:"error,omitempty" example:"stripe API returned 401 Unauthorized"`
}

// StartOperationPullResponse is the body returned by
// POST /operation/pull under the async protocol. It is intentionally
// minimal — just the job_id — so the accept path stays fast and any
// future fields (e.g., estimated runtime) can be added without
// breaking callers.
//
// The HTTP status for this response is 202 Accepted, not 200 OK, so
// the Core SDK client uses the status code as the primary protocol
// discriminator; a legacy 200 with a zip body is reported as
// ErrLegacySyncPullResponse.
type StartOperationPullResponse struct {
	// JobID is the identifier the caller uses on subsequent
	// /operation/status and /operation/result calls.
	JobID string `json:"job_id" example:"opjob_9m3x7k2n8q5p"`
}
