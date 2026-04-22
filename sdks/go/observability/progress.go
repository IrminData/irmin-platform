// Package observability defines the shared progress-event vocabulary
// used across Irmin services and connectors. The types here are pure
// data — no database, no logger, no transport. Sink-aware helpers
// (e.g., emission to an OperationLog table or a stream response) live
// in the consuming service since the right sink differs per service:
//
//   - irmin-connectors emits to OperationLog rows via
//     LogOperationProgress + LogOperationEvent.
//   - irmin Core emits to WorkflowRun.Logs via WorkflowLogBuilder.
//   - irmin-ai emits as NDJSON stream events to the chat client.
//
// Centralising the vocabulary (kinds, event shape, handler signature)
// here keeps the operator-facing semantics consistent across those
// surfaces — a "page" event means the same thing in every service —
// and lets external connector authors building against this SDK reach
// the types directly without depending on irmin-connectors internals.
//
// The vocabulary was lifted from irmin-connectors/connectors/common,
// where it shipped first as the fix for a 10-minute Stripe import
// that emitted zero log rows. Background:
// see irmin-connectors/guides/how-to-create-connectors.md.
package observability

import "time"

// ProgressEvent is a single observability event emitted from a
// long-running operation. Producers fire these into a ProgressHandler;
// the handler is responsible for turning them into the right output
// shape for its sink (DB row, log line, stream event, etc.).
//
// Not every field is meaningful for every Kind — see the field docs.
// The Kind discriminator selects which subset applies.
type ProgressEvent struct {
	// Kind discriminates the event. Use one of the ProgressKind*
	// constants below.
	Kind string

	// ResourcePath is a human-readable identifier for what's being
	// processed: an API path ("/v1/customers"), a table name
	// ("public.orders"), a file path ("inbox/report.csv"), an
	// index URI ("pinecone://my-index"). Should always be set so
	// operators with multiple targets per workflow can disambiguate.
	ResourcePath string

	// --- Pagination (ProgressKindPage) ---

	// Page is the 1-based page number within the current pagination
	// loop.
	Page int
	// RecordsSoFar is the cumulative record count accumulated so far.
	RecordsSoFar int
	// Cursor is the cursor value that produced this page (e.g.,
	// starting_after), or "" for the first page.
	Cursor string

	// --- Retry / rate-limit (ProgressKindRateLimit) ---

	// Attempt is the 0-based retry attempt.
	Attempt int
	// Wait is how long the caller is about to sleep before retrying.
	Wait time.Duration

	// --- Chunked upload (ProgressKindBatch) ---

	// Batch is the 1-based batch index.
	Batch int
	// BatchSize is the number of records in this batch.
	BatchSize int

	// --- SQL query progress (ProgressKindQuery) ---

	// Rows is the cumulative number of rows processed.
	Rows int64

	// --- File transfer (ProgressKindFile) ---

	// File is the file path currently being transferred.
	File string
	// BytesTransferred is the cumulative bytes moved for this
	// operation (or for the current file — emitter decides).
	BytesTransferred int64
	// BytesTotal is the total expected bytes, or 0 if unknown.
	BytesTotal int64
}

// ProgressKind* enumerate the event types emitted via ProgressHandler.
// String values are part of the wire format and are intentionally
// stable across services and across language boundaries (a
// TypeScript consumer in irmin-ai uses these same string values).
const (
	// ProgressKindPage fires after each successful list-page response
	// in a paginated source (HTTP cursor, vector ID list, etc.).
	ProgressKindPage = "page"
	// ProgressKindRateLimit fires when a producer is about to sleep
	// before retrying after a 429 / quota / backoff. Without this,
	// rate-limit storms look identical to a silent hang.
	ProgressKindRateLimit = "rate_limit"
	// ProgressKindBatch fires after each chunk of a bulk upload.
	ProgressKindBatch = "batch"
	// ProgressKindQuery fires during a long-running SQL row-scan.
	// Producers throttle their own emission — one row == one event
	// would flood the sink.
	ProgressKindQuery = "query"
	// ProgressKindFile fires per file during a multi-file transfer.
	ProgressKindFile = "file"
	// ProgressKindHeartbeat is emitted by the sink-side handler at a
	// fixed cadence (typically 30s) for the lifetime of the
	// operation, even if the producer's ProgressHandler is nil. It's
	// the floor of observability: no operation can ship a silent
	// 10-minute gap, even by accident.
	ProgressKindHeartbeat = "heartbeat"
)

// ProgressHandler receives observability events from long-running
// operations. Called synchronously from inside the producer's
// pagination / retry / transfer loops — implementations must return
// quickly. nil-safe: producers whose operations are short-running may
// pass nil.
type ProgressHandler func(ProgressEvent)
