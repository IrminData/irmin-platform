package common

import (
	"errors"
	"fmt"
	"irmin-connectors/db"
	"sync"
	"time"

	sdkmodels "github.com/IrminData/irmin-sdk-go/models"
	sdkprogress "github.com/IrminData/irmin-sdk-go/observability"
	"gorm.io/gorm"
)

const (
	operationKindPull   = "pull"
	operationKindPush   = "push"
	operationKindPatch  = "patch"
	operationKindSchema = "schema"
)

// AlreadyRunningError is returned by JobManager.Begin when the
// operation-execution advisory lock is already held by another
// session. Fields are populated from the row FindActiveOperationJob
// returns; when no active row exists (legacy sync holder), JobID is
// empty and StartedAt is the zero time.
//
// Handlers pass this to RespondAlreadyRunning to emit the 409
// response with the SDK's AlreadyRunningBody shape. Construct via
// Begin; do not instantiate directly in handler code.
type AlreadyRunningError struct {
	// JobID of the job currently holding the lock, empty only when
	// no OperationJob row exists for this operation (legacy caller
	// or race between row lookup and lock observation).
	JobID string

	// OperationID echoed so RespondAlreadyRunning can populate the
	// wire body without re-threading it through the handler.
	OperationID uint

	// Kind is the operation-kind string holding the lock:
	// "pull" | "push" | "patch" | "schema". Empty when the
	// blocking job was started by a caller that did not supply
	// one — treat as "unknown".
	Kind string

	// StartedAt is the CreatedAt of the blocking row; zero when no
	// row was found.
	StartedAt time.Time
}

// Error implements the error interface so AlreadyRunningError can
// be returned from anywhere an error is expected. The message is
// operator-facing; machine-readable consumers should type-assert
// via errors.As.
func (e *AlreadyRunningError) Error() string {
	if e == nil {
		return "operation already running"
	}
	if e.JobID == "" {
		return fmt.Sprintf(
			"operation %d already running (no active job row — retry later)",
			e.OperationID,
		)
	}
	return fmt.Sprintf(
		"operation %d already running (job_id=%s, kind=%s)",
		e.OperationID, e.JobID, e.Kind,
	)
}

// JobOutcome is the terminal state a Guard caller reports on
// Release: success → complete, failure → failed, cooperative stop →
// cancelled. Zero value is a failed outcome with no message so a
// caller that forgets to populate it at least surfaces as failure
// rather than accidentally masking a bug as success.
type JobOutcome struct {
	// Status must be one of OperationJobStatusComplete / Failed /
	// Cancelled. Guard.Release rejects the other (non-terminal)
	// statuses.
	Status sdkmodels.OperationJobStatus

	// Error is the operator-facing failure message when
	// Status=failed. Ignored for complete/cancelled — cancel has no
	// server-side reason, complete has nothing to say.
	Error string

	// ResultPath is the filesystem path of the finished zip when
	// Status=complete. Ignored otherwise. The Guard serialises this
	// into the OperationJob row so /operation/result can serve it.
	ResultPath string
}

// BeginOperationJobInput carries the caller-specified knobs that
// the OperationJob row needs at creation time. Kept as a struct so
// new fields can be added without breaking every call site.
type BeginOperationJobInput struct {
	// OperationID keys the advisory lock and the job's FK back to
	// the Operation row. Required.
	OperationID uint

	// ConnectorRegistrationID is persisted on the row for audit.
	// Required in production; tests may pass 0.
	ConnectorRegistrationID uint

	// ConnectorName is persisted on the row as a human-readable
	// connector slug. Passed through to the SDK status response.
	ConnectorName string

	// Kind tags the row with the operation kind (pull / push /
	// patch / schema) so 409 responses can surface which flavor is
	// blocking. Required.
	Kind string
}

// OperationGuard is the handle returned by JobManager.Begin. It
// represents a successfully-acquired operation lock and an
// associated pending OperationJob row. The caller is obligated to
// invoke Release exactly once, ideally via defer, to transition the
// row to a terminal state and free the advisory lock.
//
// The Guard is safe for concurrent Release calls: only the first
// wins; subsequent calls no-op. The row id is exposed via JobID()
// so handler responses can surface it (most relevantly on the 202
// Accepted for async pulls).
type OperationGuard struct {
	jobID       string
	operationID uint
	kind        string
	resultPath  string

	manager *JobManager

	// release is closed by Release() to signal the lock-holder
	// goroutine to exit. The lock-holder then marks the row
	// terminal and returns from its WithOperationExecutionLock
	// closure, which releases the advisory lock on the same pinned
	// session.
	release chan struct{}

	// done is closed by the lock-holder goroutine after the
	// terminal write + lock release. Release() waits on it so the
	// caller's "guard has been released" contract is synchronous.
	done chan struct{}

	releaseOnce sync.Once

	// outcome is set by Release before signalling the lock-holder
	// so the lock-holder can persist the terminal status while
	// still holding the lock (avoids a third caller beginning a
	// new job in the gap between status write and lock release).
	outcomeMu sync.Mutex
	outcome   JobOutcome
}

// JobID returns the opaque identifier of the underlying
// OperationJob row. Handlers surface this on their successful
// response (202 Accepted for async pulls, 200 for sync
// push/patch/schema).
func (g *OperationGuard) JobID() string {
	if g == nil {
		return ""
	}
	return g.jobID
}

// OperationID returns the numeric operation identifier this guard
// is protecting. Exposed for logging and for callers that want to
// correlate the guard with their existing Operation row handle.
func (g *OperationGuard) OperationID() uint {
	if g == nil {
		return 0
	}
	return g.operationID
}

// SetResultPath records the path the worker wrote the result to.
// The guard forwards this into the terminal-status update so that
// /operation/result can serve the file. Callers that have no result
// (push/patch/schema) leave it unset.
//
// Must be called before Release; calling after Release is a no-op.
func (g *OperationGuard) SetResultPath(path string) {
	if g == nil {
		return
	}
	g.outcomeMu.Lock()
	g.resultPath = path
	g.outcomeMu.Unlock()
}

// Release transitions the underlying OperationJob row to a terminal
// state and frees the advisory lock. Safe to call multiple times;
// only the first call has effect. Blocks until the lock-holder
// goroutine has applied the terminal write and returned.
//
// outcome.Status must be one of OperationJobStatusComplete /
// Failed / Cancelled. Guard converts any other value (including
// the zero value) into Failed with a defensive error message, so
// a buggy caller can't accidentally leave the row in a
// non-terminal state.
func (g *OperationGuard) Release(outcome JobOutcome) {
	if g == nil {
		return
	}
	g.releaseOnce.Do(func() {
		normalized := normalizeOutcome(outcome)
		if normalized.ResultPath == "" {
			// Honour an earlier SetResultPath call if the caller
			// didn't thread the path through the outcome struct.
			g.outcomeMu.Lock()
			normalized.ResultPath = g.resultPath
			g.outcomeMu.Unlock()
		}
		g.outcomeMu.Lock()
		g.outcome = normalized
		g.outcomeMu.Unlock()
		close(g.release)
		<-g.done

		// Close the placeholder jobWorker's done channel so
		// WaitForJob callers on sync-handler guards (push, schema,
		// patch — which never spawn an async worker goroutine to
		// close it for them) wake up. The async path already closes
		// this via runGuardedWorker's defer; doneOnce protects
		// against double-close.
		g.manager.mu.Lock()
		worker, ok := g.manager.workers[g.jobID]
		g.manager.mu.Unlock()
		if ok {
			worker.closeDone()
		}
	})
}

// normalizeOutcome enforces the terminal-status invariant documented
// on Guard.Release. Any non-terminal (or zero-value) Status becomes
// Failed so a buggy caller cannot produce a stuck row by accident.
func normalizeOutcome(outcome JobOutcome) JobOutcome {
	switch outcome.Status {
	case sdkmodels.OperationJobStatusComplete,
		sdkmodels.OperationJobStatusFailed,
		sdkmodels.OperationJobStatusCancelled:
		return outcome
	case sdkmodels.OperationJobStatusPending,
		sdkmodels.OperationJobStatusRunning:
		// Non-terminal — caller likely bug. Fall through to the
		// same defensive conversion as unknown values.
	}
	return JobOutcome{
		Status: sdkmodels.OperationJobStatusFailed,
		Error: fmt.Sprintf(
			"guard released with invalid outcome status %q — forcing failed",
			outcome.Status,
		),
	}
}

// Begin acquires the operation-execution advisory lock for
// input.OperationID on a pinned PG session, persists a pending
// OperationJob row, and returns a Guard the caller uses to
// transition the row and release the lock.
//
// Return values:
//   - (guard, nil, nil)        — lock acquired; row created
//   - (nil, alreadyErr, nil)   — lock held by another session;
//     alreadyErr carries the blocking job's details for
//     RespondAlreadyRunning
//   - (nil, nil, err)          — DB / lock-plumbing failure; the
//     caller should surface a structured 500 via
//     RespondJobError(..., JobErrorReasonTransientDB, err, "")
//
// Implementation note: the Guard holds the advisory lock for the
// lifetime of its Release call via a goroutine that pins a PG
// connection. The goroutine's WithOperationExecutionLock closure
// blocks on a release channel, applies the terminal status write
// while the lock is still held, then returns — which triggers
// Postgres's pg_advisory_unlock on the same session.
func (m *JobManager) Begin(
	input BeginOperationJobInput,
) (*OperationGuard, *AlreadyRunningError, error) {
	if input.OperationID == 0 {
		return nil, nil, errors.New("BeginOperationJobInput.OperationID is required")
	}
	if err := m.EnsureResultDir(); err != nil {
		return nil, nil, err
	}

	jobID, err := generateJobID()
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate job id: %w", err)
	}

	guard := &OperationGuard{
		jobID:       jobID,
		operationID: input.OperationID,
		kind:        input.Kind,
		manager:     m,
		release:     make(chan struct{}),
		done:        make(chan struct{}),
	}

	resultCh := make(chan beginResult, 1)

	go m.runLockHolder(input, jobID, guard, resultCh)

	r := <-resultCh
	if r.err != nil {
		return nil, nil, r.err
	}
	if r.conflict != nil {
		return nil, r.conflict, nil
	}
	return guard, nil, nil
}

// runLockHolder is the goroutine body that owns the advisory lock
// for the lifetime of the guard. It sends exactly one beginResult
// on resultCh (conflict / err / nil) before either returning
// immediately (conflict / err) or blocking on the guard's release
// channel (success).
func (m *JobManager) runLockHolder(
	input BeginOperationJobInput,
	jobID string,
	guard *OperationGuard,
	resultCh chan<- beginResult,
) {
	defer close(guard.done)

	var sent bool
	send := func(r beginResult) {
		if sent {
			return
		}
		resultCh <- r
		sent = true
	}

	acquired, lockErr := m.db.WithOperationExecutionLock(
		input.OperationID,
		func(_ *gorm.DB) error {
			if _, createErr := m.db.CreateOperationJob(&db.OperationJob{
				JobID:                   jobID,
				ConnectorRegistrationID: input.ConnectorRegistrationID,
				ConnectorName:           input.ConnectorName,
				OperationID:             input.OperationID,
				Kind:                    input.Kind,
				Status:                  string(sdkmodels.OperationJobStatusPending),
				Progress:                []byte("[]"),
			}); createErr != nil {
				// Surface to Begin; releasing the closure without
				// further work frees the advisory lock immediately.
				send(beginResult{err: fmt.Errorf("create operation job: %w", createErr)})
				return createErr
			}

			// The in-memory worker map is populated up-front so a
			// Cancel arriving before the caller starts the worker
			// still propagates. The cancel fn is a no-op context
			// cancel until the caller (async path) swaps in a real
			// one via linkWorkerCancel.
			m.registerGuardWorker(jobID)

			// Success → hand the guard back and wait for release.
			send(beginResult{})

			<-guard.release

			// Apply the outcome while still holding the lock. This
			// closes the race where another caller grabs the lock
			// in the gap between the status write and the unlock,
			// which would otherwise see status=running briefly.
			guard.outcomeMu.Lock()
			outcome := guard.outcome
			guard.outcomeMu.Unlock()
			m.applyTerminalOutcome(jobID, outcome)
			return nil
		},
	)
	if lockErr != nil && !sent {
		send(beginResult{err: fmt.Errorf("acquire operation execution lock: %w", lockErr)})
		return
	}
	if !acquired && !sent {
		// Lock held elsewhere: resolve the blocking job's id for
		// the 409 body. A NotFound here means a legacy sync holder
		// took the lock without registering a row — surface the
		// conflict anyway with an empty JobID so clients still see
		// the structured reason.
		active, lookupErr := m.db.FindActiveOperationJob(input.OperationID)
		conflict := &AlreadyRunningError{
			OperationID: input.OperationID,
		}
		if lookupErr == nil && active != nil {
			conflict.JobID = active.JobID
			conflict.Kind = activeJobKind(active)
			conflict.StartedAt = active.CreatedAt
		}
		send(beginResult{conflict: conflict})
		return
	}
}

// activeJobKind extracts the kind string from a persisted OperationJob row.
// Empty when the row was created by a pre-Kind-column migration; the
// wire shape tolerates an empty Kind as "unknown".
func activeJobKind(row *db.OperationJob) string {
	if row == nil {
		return ""
	}
	return row.Kind
}

// registerGuardWorker adds a placeholder jobWorker entry keyed by
// jobID so an early Cancel from a client that already knows the ID
// can be observed even before the async worker goroutine takes
// over. The placeholder's cancel is a no-op; the async path
// overwrites it via linkWorker before running user code.
func (m *JobManager) registerGuardWorker(jobID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, exists := m.workers[jobID]; exists {
		return
	}
	m.workers[jobID] = &jobWorker{
		cancel:        func() {},
		progress:      []sdkprogress.ProgressEvent{},
		done:          make(chan struct{}),
		isPlaceholder: true,
	}
}

// applyTerminalOutcome writes the guard's terminal outcome to the
// job row and sets ExpiresAt so the janitor eventually reaps the
// row. Errors are logged only — the lock is about to be released
// regardless.
func (m *JobManager) applyTerminalOutcome(jobID string, outcome JobOutcome) {
	var errMsg *string
	if outcome.Error != "" {
		errMsg = &outcome.Error
	} else {
		empty := ""
		errMsg = &empty
	}
	resultPath := outcome.ResultPath
	pathPtr := &resultPath
	expires := time.Now().Add(m.cfg.TTL)
	if updateErr := m.db.UpdateOperationJobStatus(
		jobID,
		string(outcome.Status),
		errMsg,
		pathPtr,
		&expires,
	); updateErr != nil {
		m.logger.Error(
			"guard failed to write terminal outcome",
			"job_id", jobID,
			"status", outcome.Status,
			"error", updateErr,
		)
	}
}

// beginResult is the internal tuple passed between the lock-holder
// goroutine and Begin. Kept here to keep the signature of
// runLockHolder readable.
type beginResult struct {
	conflict *AlreadyRunningError
	err      error
}
