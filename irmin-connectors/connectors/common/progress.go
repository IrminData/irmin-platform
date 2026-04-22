package common

import (
	"irmin-connectors/db"
	"log/slog"
	"time"
)

// ProgressEvent is a single observability event emitted from a
// connector's long-running operation. Connectors call the operation's
// ProgressHandler to surface per-page / per-batch / per-file / retry
// progress into the workflow log stream, so an apparently-stuck run
// is actually diagnosable.
//
// Not every field is meaningful for every Kind — see the field docs.
// The Kind discriminator selects which subset applies.
type ProgressEvent struct {
	// Kind discriminates the event. Use one of the ProgressKind*
	// constants below.
	Kind string

	// ResourcePath is a human-readable identifier for what's being
	// processed: an API path ("/v1/customers"), a table name
	// ("public.orders"), a file path ("inbox/report.csv"), a
	// namespace URI ("qdrant://vectors"). Should always be set.
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
	// operation (or for the current file — connector decides).
	BytesTransferred int64
	// BytesTotal is the total expected bytes, or 0 if unknown.
	BytesTotal int64
}

// ProgressKind* enumerate the event types emitted via ProgressHandler.
const (
	// ProgressKindPage fires after each successful list-page response
	// in a paginated-HTTP connector (Stripe, Pinecone list, HTTP
	// pagination).
	ProgressKindPage = "page"
	// ProgressKindRateLimit fires when a connector is about to sleep
	// before retrying a 429 / quota / backoff. Without this event,
	// rate-limit storms look like a silent hang.
	ProgressKindRateLimit = "rate_limit"
	// ProgressKindBatch fires after each chunk of a bulk upload
	// (Pinecone upserts, Postgres COPY in chunks).
	ProgressKindBatch = "batch"
	// ProgressKindQuery fires during a long-running SQL row-scan
	// (Postgres, MySQL). Callers throttle their own emission — one
	// row == one event would flood the log.
	ProgressKindQuery = "query"
	// ProgressKindFile fires per file during a multi-file transfer
	// (SFTP list/download, Firecrawl per-page scrape).
	ProgressKindFile = "file"
	// ProgressKindHeartbeat is emitted by the common pull/push
	// handler every 30s for the lifetime of the operation, even if
	// the provider's ProgressHandler is nil. It's the floor of
	// observability: no connector can ship a silent 10-minute
	// operation, even by accident.
	ProgressKindHeartbeat = "heartbeat"
)

// ProgressHandler receives observability events from long-running
// operations. Called synchronously from inside the connector's
// pagination / retry / transfer loops — implementations must return
// quickly. nil-safe: connectors whose operations are short-running
// may return nil from their PullOperationProvider.ProgressHandler /
// PushOperationProvider.ProgressHandler method.
type ProgressHandler func(ProgressEvent)

// progressLogIntervalPage controls how often page events surface into
// the operation log — one log row every N pages. Page 1 always logs
// so operators immediately see "something's happening".
const progressLogIntervalPage = 5

// progressLogIntervalBatch controls how often batch events surface.
// Batch 1 always logs.
const progressLogIntervalBatch = 10

// heartbeatInterval is the cadence at which the common handler emits
// a ProgressKindHeartbeat for the duration of a pull/push operation.
// Chosen to be long enough not to flood the log stream on short
// operations, short enough to make a stuck 10-minute operation
// obvious.
const heartbeatInterval = 30 * time.Second

// progressMessageDefault is the message used for events that don't
// carry a more specific verb (heartbeats, unknown kinds). Pulled
// out as a constant so the goconst linter doesn't flag the
// duplication, and so a future change ripples in one place.
const progressMessageDefault = "Operation in progress"

// LogOperationProgress emits a ProgressEvent as an operation log row,
// applying per-kind throttling. Connectors should call this instead
// of ripping throttling logic back into each connector's
// makeProgressHandler — that's how Stripe got here in the first place.
//
// Throttling rules:
//   - Page: logs on page 1 and every progressLogIntervalPage pages.
//   - Batch: logs on batch 1 and every progressLogIntervalBatch batches.
//   - Query, File, RateLimit, Heartbeat: always log. Callers of Query
//     and File should pre-throttle at the call site (e.g., every 1000
//     rows, every 5s of wall clock) to avoid one-row-per-event floods.
//
// Nil-safe for dbInstance + logger — used by tests that don't want DB
// side effects.
func LogOperationProgress(
	dbInstance *db.Database,
	logger *slog.Logger,
	operationID uint,
	event ProgressEvent,
) {
	if !shouldEmitProgress(event) {
		return
	}
	message, metadata := renderProgressEvent(event)
	LogOperationEvent(
		dbInstance,
		logger,
		operationID,
		db.LogEventTypeInfo,
		message,
		metadata,
	)
}

// shouldEmitProgress applies per-kind throttling. Returns true when
// the event should surface into the operation log.
func shouldEmitProgress(event ProgressEvent) bool {
	switch event.Kind {
	case ProgressKindPage:
		if event.Page <= 1 {
			return true
		}
		return event.Page%progressLogIntervalPage == 0
	case ProgressKindBatch:
		if event.Batch <= 1 {
			return true
		}
		return event.Batch%progressLogIntervalBatch == 0
	case ProgressKindQuery, ProgressKindFile, ProgressKindRateLimit, ProgressKindHeartbeat:
		return true
	default:
		// Unknown kinds still surface — better an extra log row than
		// a silently-dropped event.
		return true
	}
}

// renderProgressEvent converts a ProgressEvent into the (message,
// metadata) pair LogOperationEvent wants. Kept as a pure function so
// it's trivially testable.
func renderProgressEvent(event ProgressEvent) (string, map[string]any) {
	metadata := map[string]any{
		"kind": event.Kind,
	}
	if event.ResourcePath != "" {
		metadata["resource_path"] = event.ResourcePath
	}

	switch event.Kind {
	case ProgressKindPage:
		metadata["page"] = event.Page
		metadata["records"] = event.RecordsSoFar
		if event.Cursor != "" {
			metadata["cursor"] = event.Cursor
		}
		return "Operation in progress: fetching page", metadata
	case ProgressKindRateLimit:
		metadata["attempt"] = event.Attempt
		metadata["wait_ms"] = event.Wait.Milliseconds()
		return "Operation in progress: rate-limit backoff", metadata
	case ProgressKindBatch:
		metadata["batch"] = event.Batch
		metadata["batch_size"] = event.BatchSize
		return "Operation in progress: processing batch", metadata
	case ProgressKindQuery:
		metadata["rows"] = event.Rows
		return "Operation in progress: query scan", metadata
	case ProgressKindFile:
		if event.File != "" {
			metadata["file"] = event.File
		}
		metadata["bytes_transferred"] = event.BytesTransferred
		if event.BytesTotal > 0 {
			metadata["bytes_total"] = event.BytesTotal
		}
		return "Operation in progress: file transfer", metadata
	case ProgressKindHeartbeat:
		return progressMessageDefault, metadata
	default:
		return progressMessageDefault, metadata
	}
}

// startHeartbeat fires a ProgressKindHeartbeat event every
// heartbeatInterval until stop is closed. Designed to be run as a
// goroutine from HandleOperationPull / HandleOperationPush so every
// operation — even one whose provider's ProgressHandler returns nil —
// has a baseline log cadence.
//
// The goroutine exits when stop is closed. Callers typically do:
//
//	stop := make(chan struct{})
//	go startHeartbeat(dbInstance, logger, operationID, resourcePath, stop)
//	defer close(stop)
func startHeartbeat(
	dbInstance *db.Database,
	logger *slog.Logger,
	operationID uint,
	resourcePath string,
	stop <-chan struct{},
) {
	ticker := time.NewTicker(heartbeatInterval)
	defer ticker.Stop()
	for {
		select {
		case <-stop:
			return
		case <-ticker.C:
			LogOperationProgress(
				dbInstance,
				logger,
				operationID,
				ProgressEvent{
					Kind:         ProgressKindHeartbeat,
					ResourcePath: resourcePath,
				},
			)
		}
	}
}
