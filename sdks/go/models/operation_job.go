package irminmodels

import (
	"time"

	"github.com/IrminData/irmin-platform/sdks/go/observability"
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
// operation (pull / push / patch).
//
// The connector service creates one of these on POST /operation/{pull,
// push,patch}, returns its ID + per-job operation token to the caller
// in StartOperationJobResponse, then fills in status/progress as the
// worker runs. The full job payload is typically only returned inside
// status responses; the start route itself returns the slimmer
// StartOperationJobResponse to keep the accept-fast path fast.
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

// StartOperationJobResponse is the body returned by
// POST /operation/pull, /operation/push, and /operation/patch under
// the async protocol. The HTTP status is 202 Accepted; a legacy 200
// with a zip body is reported as ErrLegacySyncResponse.
//
// The response carries two fields:
//
//   - JobID identifies the async job for subsequent /operation/status,
//     /operation/result, and /operation/cancel calls.
//
//   - OperationToken is a short-lived, job-scoped bearer credential
//     minted by the server. It is the ONLY credential accepted on the
//     per-job lifecycle routes — the broad system token used to start
//     the operation is intentionally rejected there. This preserves
//     the scope-limitation property of operation tokens: a compromised
//     system token cannot poll, fetch, or cancel an in-flight job it
//     did not start.
//
// The SDK's Client.StartOperation{Pull,Push,Patch} converts this body
// into a *connectorsclient.OperationJob handle that encapsulates the
// token so callers never pass it around manually.
type StartOperationJobResponse struct {
	// JobID is the identifier the caller uses on subsequent
	// /operation/status and /operation/result calls.
	JobID string `json:"job_id" example:"opjob_9m3x7k2n8q5p"`

	// OperationToken is the per-job bearer credential for lifecycle
	// routes. Minted by the server on Start*; TTL matches the
	// underlying OperationJob row.
	OperationToken string `json:"operation_token" example:"optk_7f3d2a9c1e6b"`
}

// AlreadyRunningBody is the wire shape returned by any connector
// endpoint that refuses a request because the same operation is
// already in flight (HTTP 409 Conflict).
//
// The pre-async protocol returned just {"error": "Operation is already
// running"} — opaque to callers. This body carries the in-flight
// job_id so callers can redirect their polling (or cancel the
// blocker) without guessing.
//
// JobID is guaranteed non-empty when the server side uses the unified
// JobManager.Begin path. It may be empty when a legacy sync code path
// holds the lock without registering a job row; callers should treat
// that as "retry later" rather than a hard error.
type AlreadyRunningBody struct {
	// Error is the stable human-readable message. Always
	// "Operation is already running" — kept for backwards
	// compatibility with clients that key off the error string.
	Error string `json:"error" example:"Operation is already running"`

	// JobID is the opaque identifier of the currently-running job.
	// Clients can pass this straight to CancelOperationJob or
	// GetOperationJobStatus. Empty only for legacy holders that have
	// not migrated to the JobManager.Begin path yet.
	JobID string `json:"job_id,omitempty" example:"opjob_9m3x7k2n8q5p"`

	// OperationID is the connector-service-local numeric ID of the
	// operation the lock was taken on. Present so operator-facing
	// logs can cross-reference the operation row directly.
	OperationID uint `json:"operation_id,omitempty" example:"42"`

	// Kind is the operation kind holding the lock. One of "pull",
	// "push", "patch", "schema". Helps operators distinguish a
	// long-running pull from a fast sync push when triaging
	// contention.
	Kind string `json:"kind,omitempty" example:"pull"`

	// StartedAt is when the in-flight job was accepted. Clients can
	// compute elapsed time to decide whether to wait or cancel. nil
	// for legacy sync holders with no registered row.
	//
	// Pointer rather than time.Time + omitempty because encoding/json's
	// omitempty does not treat a zero time.Time as empty — it would
	// serialise as "0001-01-01T00:00:00Z" on the wire. Matches the
	// convention used by ExpiresAt above and the *time.Time fields
	// in the other models in this package.
	StartedAt *time.Time `json:"started_at,omitempty"`
}

// JobErrorReason enumerates the machine-readable failure modes of
// the /operation/{status,result,cancel} endpoints. Stable strings —
// Core's poll wrapper compares against these values directly.
//
// Retryability is NOT encoded in the reason itself — use the
// Retryable field on JobErrorBody. Some reasons are retryable in
// some contexts and not in others (e.g., a "not_found" on cancel is
// terminal for the caller but a "not_found" during a race with
// janitor reclaim is benign).
type JobErrorReason string

const (
	// JobErrorReasonTransientDB signals a recoverable database-layer
	// error (connection reset, pool exhaustion, statement timeout).
	// Callers should retry after a short backoff.
	JobErrorReasonTransientDB JobErrorReason = "transient_db_error"

	// JobErrorReasonCorruptedRow signals that the job row exists but
	// its persisted state is unreadable (e.g., malformed progress
	// JSON). Not retryable — the row needs operator intervention or
	// janitor reaping.
	JobErrorReasonCorruptedRow JobErrorReason = "corrupted_job_state"

	// JobErrorReasonNotFound signals that no job with the requested
	// ID exists. Returned on 404; callers should not retry.
	JobErrorReasonNotFound JobErrorReason = "not_found"

	// JobErrorReasonInvalidRequest signals that the caller sent a
	// malformed request (missing job_id, bad token, etc.). Not
	// retryable without changing the request.
	JobErrorReasonInvalidRequest JobErrorReason = "invalid_request"

	// JobErrorReasonInternal is the catch-all for failures that
	// don't fit the other buckets. Not retryable by default; the
	// response body's human-readable Error field carries detail.
	JobErrorReasonInternal JobErrorReason = "internal"
)

// JobErrorBody is the structured error envelope returned by the
// async-job endpoints on any non-2xx response (404, 409 auth issues,
// 500). The legacy unstructured {"error": "..."} shape is a proper
// subset — the Error field is always populated — so middleware
// tolerant of the legacy shape still reads the message.
//
// Clients driving retry logic should read Reason + Retryable rather
// than parsing Error. Example: Core's poll wrapper retries only when
// Retryable is true AND Reason is JobErrorReasonTransientDB.
type JobErrorBody struct {
	// Error is the operator-facing human-readable message. Stable
	// enough for log grep but not a machine-readable code.
	Error string `json:"error" example:"failed to load job"`

	// Reason is the machine-readable failure classification. See
	// JobErrorReason for the stable value set.
	Reason JobErrorReason `json:"reason" example:"transient_db_error"`

	// Retryable reports whether the caller should retry the same
	// request after a short backoff. False for any terminal failure
	// mode (not_found, corrupted_job_state, invalid_request).
	Retryable bool `json:"retryable" example:"true"`

	// JobID echoes the ID from the URL when the server could parse
	// one. Empty for request-level failures (malformed URL, missing
	// path parameter).
	JobID string `json:"job_id,omitempty" example:"opjob_9m3x7k2n8q5p"`
}

// CancelOperationJobResponse is the 200 body returned by
// POST /operation/cancel/:job_id. The endpoint is idempotent —
// calling it on a terminal (complete/failed/cancelled) job still
// returns 200 — so callers that want to distinguish "we actually
// signalled a running worker" from "job was already terminal" can
// inspect WasActive.
//
// A 200 response does NOT mean the worker has exited. Cancel is
// fire-and-forget: the signal is accepted and the worker's context
// is cancelled, but the worker may still be in its shutdown path
// for a short window. Poll /operation/status to observe the
// terminal transition.
type CancelOperationJobResponse struct {
	// JobID echoes the ID from the URL so batched responses can be
	// associated with their requests without re-parsing.
	JobID string `json:"job_id" example:"opjob_9m3x7k2n8q5p"`

	// Status is the job's current lifecycle state at the moment
	// cancel was processed. If WasActive is true this will usually
	// still be "running" (the cancel signal has been sent but the
	// worker has not yet transitioned). If WasActive is false this
	// is a terminal status.
	Status OperationJobStatus `json:"status" example:"running"`

	// WasActive is true when cancel actually signalled a live
	// worker. False for idempotent no-op calls against terminal
	// jobs — the request is still a success, but the caller can
	// distinguish "we cancelled it" from "it was already done".
	WasActive bool `json:"was_active" example:"true"`

	// Message is a human-readable status line. Kept for log
	// readability; callers driving UI should use Status + WasActive
	// instead.
	Message string `json:"message" example:"cancellation requested"`
}
