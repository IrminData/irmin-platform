package common

import (
	"context"
	"irmin-connectors/db"
	"log/slog"
	"time"

	sdkprogress "github.com/IrminData/irmin-platform/sdks/go/observability"
)

// jobProgressKey is the context key used by the async-pull worker to
// smuggle its append-progress closure into provider code without
// changing every provider's ProgressHandler signature. When a
// provider calls NewProgressHandler(db, logger, op) from inside
// InitializeClient (which now receives the job-scoped ctx), the
// returned handler fans out to the job's Progress slice as well as
// the OperationLog.
//
// Type is a named struct so the key cannot collide with any other
// context value in the process.
type jobProgressKey struct{}

// WithJobProgress returns a new ctx that carries appendProgress —
// consumed by NewProgressHandler inside the provider's
// InitializeClient to fan out events to the job status response. The
// async-pull worker is the only caller; no production code outside
// asyncOperation.go should use this directly.
func WithJobProgress(
	ctx context.Context,
	appendProgress func(sdkprogress.ProgressEvent),
) context.Context {
	return context.WithValue(ctx, jobProgressKey{}, appendProgress)
}

// jobProgressFromContext returns the appendProgress closure set by
// WithJobProgress, or nil if ctx carries none. nil-safe call sites
// simply skip the fan-out.
func jobProgressFromContext(ctx context.Context) func(sdkprogress.ProgressEvent) {
	if ctx == nil {
		return nil
	}
	fn, _ := ctx.Value(jobProgressKey{}).(func(sdkprogress.ProgressEvent))
	return fn
}

// ProgressEvent / ProgressHandler / ProgressKind* are now canonical
// in sdks/go/observability so every Irmin service (Core
// orchestrator, AI agents) and external connector authors building
// against the SDK reach the same vocabulary. The aliases below keep
// the in-repo import path (`common.ProgressEvent`, etc.) working
// unchanged for every existing connector — type identity is
// preserved by Go's alias semantics, so consumers can mix the two
// import paths without conversion.
//
// New code should prefer the SDK import directly:
//
//	import sdkprogress "github.com/IrminData/irmin-platform/sdks/go/observability"
//
// These aliases stay as the backward-compat seam.

// ProgressEvent — see [sdkprogress.ProgressEvent].
type ProgressEvent = sdkprogress.ProgressEvent

// ProgressHandler — see [sdkprogress.ProgressHandler].
type ProgressHandler = sdkprogress.ProgressHandler

// ProgressKind* — see [sdkprogress] for documentation. String values
// are the cross-language wire format and remain stable.
const (
	ProgressKindPage      = sdkprogress.ProgressKindPage
	ProgressKindRateLimit = sdkprogress.ProgressKindRateLimit
	ProgressKindBatch     = sdkprogress.ProgressKindBatch
	ProgressKindQuery     = sdkprogress.ProgressKindQuery
	ProgressKindFile      = sdkprogress.ProgressKindFile
	ProgressKindHeartbeat = sdkprogress.ProgressKindHeartbeat
)

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

// NewProgressHandler returns a ProgressHandler that forwards every
// event to LogOperationProgress with the given dbInstance + logger,
// using the operation's ID. The standard implementation every Phase 3
// connector returns from its provider's ProgressHandler(operation)
// method — written once here so a future bug fix to the dispatch
// shape (e.g. tagging events with the operation slug, capturing
// per-event timing) propagates everywhere instead of needing a
// patch in 5+ closures.
//
// nil-operation safe: an event arriving before the operation is
// hydrated logs against operationID=0, which the LogOperationProgress
// → LogOperationEvent path tolerates. Callers that want to drop
// events when operation is nil can wrap this themselves.
func NewProgressHandler(
	dbInstance *db.Database,
	logger *slog.Logger,
	operation *db.Operation,
) ProgressHandler {
	return NewProgressHandlerWithContext(context.Background(), dbInstance, logger, operation)
}

// NewProgressHandlerWithContext is the async-aware variant: if ctx
// carries a WithJobProgress closure, the returned handler fans every
// event out to the job's Progress slice in addition to
// LogOperationProgress, so GET /operation/status/:job_id surfaces
// per-page / per-batch / rate-limit events to polling clients. When
// ctx is nil or carries no appendProgress, behaviour collapses to
// plain NewProgressHandler — legacy call sites stay unchanged.
//
// Providers that want the fan-out should call this from inside
// InitializeClient (which now receives a job-scoped ctx), and pass
// the returned handler to their vendor client in place of the
// ctx-less NewProgressHandler. New connectors should prefer this
// variant; the older one is retained for non-async callers (push,
// patch) until they migrate.
func NewProgressHandlerWithContext(
	ctx context.Context,
	dbInstance *db.Database,
	logger *slog.Logger,
	operation *db.Operation,
) ProgressHandler {
	appendJob := jobProgressFromContext(ctx)
	return func(event ProgressEvent) {
		var operationID uint
		if operation != nil {
			operationID = operation.ID
		}
		LogOperationProgress(dbInstance, logger, operationID, event)
		if appendJob != nil {
			appendJob(event)
		}
	}
}

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
	// Nil-safe per the docstring contract — connectors return real
	// handlers from ProgressHandler(operation) before InitializeClient
	// has hydrated dbInstance, and tests instantiate bare providers.
	// In both cases the handler may fire with a nil dbInstance and we
	// must no-op rather than panic. logger==nil is also tolerated;
	// LogOperationEvent itself logs through it on marshal errors so
	// nil there would be a separate panic.
	if dbInstance == nil || logger == nil {
		return
	}
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

// ThrottledQueryEmitter returns a closure that wraps handler with a
// "fire at most every minRows of progress OR every minInterval of
// wall clock, whichever first" gate. The first call always emits so
// the operator immediately sees the operation is alive.
//
// Designed for ProgressKindQuery (and any future per-row /
// per-byte kind that LogOperationProgress doesn't pre-throttle):
// callers know the natural per-iteration granularity and want to
// emit once per "interesting amount of progress" rather than every
// row. SQL row scans (Postgres / MySQL) are the immediate use case
// — millions of rows.Next() iterations would flood the log otherwise.
//
// Returns a no-op when handler is nil so the row-loop call site can
// invoke it unconditionally.
func ThrottledQueryEmitter(
	handler ProgressHandler,
	resourcePath string,
	minRows int64,
	minInterval time.Duration,
) func(rowsScanned int64) {
	if handler == nil {
		return func(int64) {}
	}
	var lastRows int64 = -1
	var lastEmit time.Time
	return func(rows int64) {
		if lastRows < 0 {
			// First call always emits — operator-visible "started"
			// signal regardless of throttle thresholds.
			lastRows, lastEmit = rows, time.Now()
			handler(ProgressEvent{
				Kind:         ProgressKindQuery,
				ResourcePath: resourcePath,
				Rows:         rows,
			})
			return
		}
		if rows-lastRows < minRows && time.Since(lastEmit) < minInterval {
			return
		}
		lastRows, lastEmit = rows, time.Now()
		handler(ProgressEvent{
			Kind:         ProgressKindQuery,
			ResourcePath: resourcePath,
			Rows:         rows,
		})
	}
}
