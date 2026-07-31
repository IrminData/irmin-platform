package common

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-connectors/db"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"time"

	sdkmodels "github.com/IrminData/irmin-sdk-go/models"
	sdkprogress "github.com/IrminData/irmin-sdk-go/observability"
	"gorm.io/gorm"
)

// Default knobs tuned for the connector-service runtime. All are
// exposed via JobManagerConfig so deployments can override without
// recompiling (especially TTL — we may want a much shorter window on
// small result payloads or a longer one when core is wedged).
const (
	// DefaultJobTTL is how long a completed job's row + result file
	// persist before the janitor reaps them. 15 minutes is a
	// conservative window: Core's poll cadence is ~5s and the
	// download is a single GET, so 15m covers multi-minute Core
	// stalls without letting result files linger indefinitely.
	DefaultJobTTL = 15 * time.Minute

	// DefaultJanitorInterval is the cadence at which the janitor
	// scans for expired jobs. Set to 1m so a 15m TTL has 15
	// opportunities to be reaped — misaligned timings mean a row may
	// survive up to DefaultJobTTL+DefaultJanitorInterval, which is
	// acceptable.
	DefaultJanitorInterval = 1 * time.Minute

	// DefaultJobIDByteLen controls the entropy of the opaque job ID.
	// 16 bytes → 32 hex chars → 2^128 namespace, large enough that
	// collisions are a non-concern for the janitor's purge window.
	DefaultJobIDByteLen = 16

	// DefaultStuckThreshold is the default "no updates in this long
	// means the worker is dead" window used by the janitor's
	// stuck-row reclaim path. 30 minutes is ~60x the heartbeat
	// cadence (30s), so a live-but-quiet worker has to miss many
	// heartbeats before being considered dead. Deployments with
	// much shorter job lifetimes can tune this down via
	// JobManagerConfig.StuckThreshold.
	DefaultStuckThreshold = 30 * time.Minute
)

// jobIDPrefix is prepended to the random suffix so server-side logs
// and error messages carry a visual marker distinct from other
// identifiers (operation tokens, connector sqids, etc.). Kept short to
// avoid bloating response payloads.
const jobIDPrefix = "opjob_"

// JobResultDirSegment is the subdirectory under os.TempDir() that
// holds result zips. Scoped to the service so concurrent services
// running on the same host don't collide.
const JobResultDirSegment = "irmin-connectors"

// WorkerFunc is the body the JobManager runs on a background goroutine
// after StartJob returns 202 to the caller. It receives:
//   - ctx: a job-scoped Context. Canceled when the client calls
//     /operation/cancel/:job_id or when the service is shutting down.
//     Workers MUST honour ctx.Done — the cancel handler relies on
//     ctx cancellation to stop the pull.
//   - appendProgress: thread-safe append into the job's cumulative
//     progress slice. Wire this into the provider's ProgressHandler.
//   - resultPath: absolute path where the worker MUST write the
//     finished zip. The path is pre-allocated inside
//     JobResultDirSegment; the worker is free to overwrite it.
//
// Return nil on success; any error marks the job as failed and is
// surfaced on the status response.
type WorkerFunc func(
	ctx context.Context,
	appendProgress func(sdkprogress.ProgressEvent),
	resultPath string,
) error

// JobManagerConfig parameterises the manager. Zero-value fields fall
// back to the Default* constants. Kept small on purpose — the
// production deployment never needs more than TTL/janitor/result-dir.
type JobManagerConfig struct {
	// TTL is how long a terminal job (complete/failed/cancelled)
	// lives before the janitor deletes it. Zero → DefaultJobTTL.
	TTL time.Duration

	// JanitorInterval is the janitor tick cadence. Zero →
	// DefaultJanitorInterval. Set to a large value in tests to
	// disable automatic sweeping and drive it by hand via RunJanitor.
	JanitorInterval time.Duration

	// ResultDir is the directory result zips are written under. Zero
	// → filepath.Join(os.TempDir(), JobResultDirSegment). Tests pass
	// a t.TempDir() so the janitor's filesystem unlinks don't touch
	// /tmp/irmin-connectors between test runs.
	ResultDir string

	// StuckThreshold controls the janitor's layer-B reclaim: rows
	// in pending/running whose updated_at is older than now-threshold
	// are candidates for being marked failed (after the janitor
	// confirms their advisory lock is free). Zero →
	// DefaultStuckThreshold. Tests drive this to a small value so
	// they can exercise the reclaim path without waiting 30 minutes.
	StuckThreshold time.Duration
}

// JobStore is the minimal persistence surface the JobManager relies
// on. Production code passes a *db.Database (adapted via
// gormJobStore); tests can provide an in-memory implementation so the
// manager's state-machine behaviour is unit-testable without a
// Postgres instance.
type JobStore interface {
	CreateOperationJob(job *db.OperationJob) (*db.OperationJob, error)
	GetOperationJob(jobID string) (*db.OperationJob, error)
	UpdateOperationJobStatus(
		jobID string,
		status string,
		errMsg *string,
		resultPath *string,
		expiresAt *time.Time,
	) error
	UpdateOperationJobProgress(jobID string, progressJSON []byte) error
	DeleteExpiredOperationJobs(now time.Time) (int64, error)
	ListExpiredOperationJobs(now time.Time) ([]db.OperationJob, error)

	// FindActiveOperationJob returns the most recent non-terminal
	// job for operationID, or gorm.ErrRecordNotFound if none exists.
	// Used by Begin to populate AlreadyRunningError.JobID when a
	// lock contention happens.
	FindActiveOperationJob(operationID uint) (*db.OperationJob, error)

	// ListStuckOperationJobs returns non-terminal jobs whose
	// updated_at is older than threshold — candidates for the
	// janitor's stuck-row reclaim path.
	ListStuckOperationJobs(threshold time.Time) ([]db.OperationJob, error)

	// CreateOperationLog persists a log entry tied to an Operation.
	// Used by the cancel path to record an audit-trail row when a job
	// transitions to cancelled — progress events alone don't tell an
	// operator "this is where the user pulled the plug".
	CreateOperationLog(operationLog *db.OperationLog) (*db.OperationLog, error)

	// WithOperationExecutionLock runs fn inside a session-scoped
	// advisory lock on operationID. Returns (true, err) if the lock
	// was acquired (err is fn's return); (false, nil) if the lock
	// was already held by another session.
	WithOperationExecutionLock(
		operationID uint,
		fn func(conn *gorm.DB) error,
	) (bool, error)
}

// JobManager owns the lifecycle of async operation jobs: persistence,
// worker goroutines, cancellation, and janitor GC. Construct one per
// process and share by reference; it is safe for concurrent use.
type JobManager struct {
	db     JobStore
	logger *slog.Logger
	cfg    JobManagerConfig

	// mu guards workers. We keep worker metadata (cancel fn, mutable
	// progress slice) in memory only — the DB holds the canonical
	// persisted snapshot but every in-flight append bounces through
	// the in-memory slice first to keep the hot path off Postgres.
	mu      sync.Mutex
	workers map[string]*jobWorker

	// janitorOnce gates StartJanitor so a double-call from
	// initialization code can't leak a second goroutine.
	janitorOnce sync.Once
	janitorStop chan struct{}
}

// jobWorker is the in-memory handle for a running or recently-finished
// job. Held in JobManager.workers keyed by job ID. Kept separate from
// the DB row because the cancel function and the progress slice are
// not persistent state — they are process-local collaboration between
// the StartJob / runWorker / Cancel paths.
type jobWorker struct {
	// cancel terminates the worker's context. Idempotent — calling
	// after the worker has already finished is a no-op.
	cancel context.CancelFunc

	// progressMu guards progress AND isPlaceholder. Every append
	// (fired from the provider's handler) takes this before
	// touching the slice.
	progressMu sync.Mutex
	progress   []sdkprogress.ProgressEvent

	// isPlaceholder is true while the worker entry is a stand-in
	// created by JobManager.Begin (cancel is a no-op fn). Flipped
	// false by linkWorkerCancel when the real async worker
	// goroutine takes over. Exposed via CancelWithOutcome so the
	// cancel response can report was_active — a cancel against a
	// placeholder or exited worker should surface as "no-op"
	// rather than falsely claiming a running worker was stopped.
	isPlaceholder bool

	// cancelPending is set by CancelWithOutcome when a cancel
	// arrives while the worker is still a placeholder. The placeholder's
	// cancel fn is a no-op — without this flag a cancel request
	// that lands in the narrow window between Begin's registerGuardWorker
	// and StartJobWithGuard's linkWorkerCancel would be silently
	// dropped. linkWorkerCancel observes cancelPending and, if set,
	// fires the real cancel immediately after installing it so the
	// worker goroutine starts with ctx.Err() already populated.
	cancelPending bool

	// done is closed when the worker goroutine returns OR (for
	// sync-handler guards that never spawn a worker goroutine) when
	// Guard.Release completes. Used by WaitForJob and
	// graceful-shutdown code to wait for a job's natural
	// termination. doneOnce gates the close so both the async-worker
	// exit path and the sync-handler release path can call it
	// without double-close panics.
	done     chan struct{}
	doneOnce sync.Once
}

// closeDone closes the worker's done channel idempotently. Both the
// async worker goroutine (via defer in runGuardedWorker) and the
// sync-handler guard release path call it; whichever fires first
// wins, the other no-ops.
func (w *jobWorker) closeDone() {
	w.doneOnce.Do(func() { close(w.done) })
}

// NewJobManager builds a JobManager against the provided database and
// logger. Defaults are applied for any zero-value config field; the
// caller is responsible for eventually invoking StartJanitor on the
// returned manager so expired jobs get reaped.
func NewJobManager(
	dbInstance *db.Database,
	logger *slog.Logger,
	cfg JobManagerConfig,
) *JobManager {
	return NewJobManagerWithStore(dbInstance, logger, cfg)
}

// NewJobManagerWithStore is the test-friendly constructor: it accepts
// any JobStore (real DB, in-memory fake) so unit tests don't need a
// running Postgres. Production callers should use NewJobManager with
// a *db.Database — the latter satisfies JobStore directly via the
// methods defined on db.Database.
func NewJobManagerWithStore(
	store JobStore,
	logger *slog.Logger,
	cfg JobManagerConfig,
) *JobManager {
	if cfg.TTL == 0 {
		cfg.TTL = DefaultJobTTL
	}
	if cfg.JanitorInterval == 0 {
		cfg.JanitorInterval = DefaultJanitorInterval
	}
	if cfg.ResultDir == "" {
		cfg.ResultDir = filepath.Join(os.TempDir(), JobResultDirSegment)
	}
	if cfg.StuckThreshold == 0 {
		cfg.StuckThreshold = DefaultStuckThreshold
	}
	return &JobManager{
		db:          store,
		logger:      logger,
		cfg:         cfg,
		workers:     make(map[string]*jobWorker),
		janitorStop: make(chan struct{}),
	}
}

// EnsureResultDir creates the result directory if it does not exist.
// Called lazily by StartJob so the first pull on a fresh pod works
// without an init step, and idempotent so repeated calls are free.
func (m *JobManager) EnsureResultDir() error {
	if err := os.MkdirAll(m.cfg.ResultDir, 0o750); err != nil {
		return fmt.Errorf("failed to create result directory %q: %w", m.cfg.ResultDir, err)
	}
	return nil
}

// StartJob persists a new OperationJob row in status=pending, spawns a
// worker goroutine that runs fn under a job-scoped context, and
// returns the job record to the caller (so the HTTP handler can write
// 202 + {job_id}).
//
// The caller owns: selecting the connector / operation fields on the
// OperationJob. This function fills in JobID, Status, CreatedAt,
// Progress (empty), and triggers the worker.
//
// If fn returns nil, the worker transitions the job to complete and
// writes ExpiresAt = now + TTL. If fn returns a non-nil error, the
// worker transitions to failed and records the error message. If the
// job's context is cancelled before fn returns, the worker
// transitions to cancelled (even if fn eventually returns nil — cancel
// wins the race).
func (m *JobManager) StartJob(
	ctx context.Context,
	connectorRegistrationID uint,
	connectorName string,
	operationID uint,
	fn WorkerFunc,
) (*db.OperationJob, error) {
	if err := m.EnsureResultDir(); err != nil {
		return nil, err
	}

	jobID, err := generateJobID()
	if err != nil {
		return nil, fmt.Errorf("failed to generate job id: %w", err)
	}

	operationToken, err := generateJobOperationToken()
	if err != nil {
		return nil, fmt.Errorf("failed to generate operation token: %w", err)
	}

	resultPath := filepath.Join(m.cfg.ResultDir, jobID+".zip")

	job := &db.OperationJob{
		JobID:                   jobID,
		ConnectorRegistrationID: connectorRegistrationID,
		ConnectorName:           connectorName,
		OperationID:             operationID,
		Status:                  string(sdkmodels.OperationJobStatusPending),
		Progress:                []byte("[]"),
		OperationToken:          operationToken,
		// ResultPath is intentionally left empty until the terminal
		// success transition. Pre-populating this at creation time can
		// leak a non-existent path if the terminal status write fails.
	}
	if _, createErr := m.db.CreateOperationJob(job); createErr != nil {
		return nil, createErr
	}

	// The worker context is derived from context.Background rather
	// than the request ctx so a client disconnect on the accept
	// request doesn't tear down the worker mid-pull. Cancellation is
	// driven by the explicit /operation/cancel path.
	workerCtx, cancel := context.WithCancel(context.Background())

	worker := &jobWorker{
		cancel:   cancel,
		progress: []sdkprogress.ProgressEvent{},
		done:     make(chan struct{}),
	}

	m.mu.Lock()
	m.workers[jobID] = worker
	m.mu.Unlock()

	go m.runWorker(workerCtx, jobID, worker, resultPath, fn)

	// `ctx` is the request context, only used here so callers (tests)
	// can bail early if the request is already dead before we kick
	// off the goroutine. We do not propagate it into the worker —
	// see the note above.
	if ctxErr := ctx.Err(); ctxErr != nil {
		// Already cancelled by the caller — cancel the worker so it
		// doesn't run against a dead operation.
		cancel()
	}

	return job, nil
}

// StartJobWithGuard takes ownership of a guard returned by
// JobManager.Begin and spawns a background worker goroutine that
// runs fn. The guard is released with the terminal outcome fn
// produces — success → complete, error → failed, ctx cancelled →
// cancelled, panic → failed (recovered; not rethrown). Returns
// immediately so the caller can write its 202 Accepted response.
//
// Unlike the legacy StartJob path, this function does NOT take the
// advisory lock inside the worker — the guard's goroutine is
// already holding it on a pinned PG session. The worker purely
// runs user code.
//
// The resultPath the worker writes to is placed under the
// manager's ResultDir and named after the guard's jobID; callers
// that need a different layout can pre-compute a path and have
// their WorkerFunc ignore the one we pass.
func (m *JobManager) StartJobWithGuard(guard *OperationGuard, fn WorkerFunc) *db.OperationJob {
	resultPath := filepath.Join(m.cfg.ResultDir, guard.jobID+".zip")

	// The worker context is derived from context.Background rather
	// than the request ctx so a client disconnect on the 202 accept
	// path doesn't tear down the worker mid-job. Cancellation flows
	// through the explicit /operation/cancel path only.
	workerCtx, cancel := context.WithCancel(context.Background())
	m.linkWorkerCancel(guard.jobID, cancel)

	go m.runGuardedWorker(workerCtx, guard, resultPath, fn)

	// The 202 response only needs JobID + OperationID + Status;
	// we return a minimal record shaped like the row the Begin
	// goroutine already persisted. A re-read from the DB would be
	// accurate but costs a round-trip for no caller gain.
	return &db.OperationJob{
		JobID:       guard.jobID,
		OperationID: guard.operationID,
		Status:      string(sdkmodels.OperationJobStatusPending),
	}
}

// linkWorkerCancel swaps the real worker's cancel function into the
// jobWorker map entry that Begin registered as a placeholder. Must
// run before the worker goroutine does any user work so an early
// /operation/cancel hitting between Begin and the worker starting
// still propagates. Also flips isPlaceholder false so
// CancelWithOutcome reports was_active=true going forward.
func (m *JobManager) linkWorkerCancel(jobID string, cancel context.CancelFunc) {
	m.mu.Lock()
	worker, ok := m.workers[jobID]
	m.mu.Unlock()
	if !ok {
		// No placeholder exists — this is a non-guarded start (old
		// path) or an already-reaped job. Install a fresh worker
		// entry so Cancel still works.
		m.mu.Lock()
		m.workers[jobID] = &jobWorker{
			cancel:   cancel,
			progress: []sdkprogress.ProgressEvent{},
			done:     make(chan struct{}),
		}
		m.mu.Unlock()
		return
	}
	worker.progressMu.Lock()
	worker.cancel = cancel
	worker.isPlaceholder = false
	pending := worker.cancelPending
	worker.progressMu.Unlock()
	// Replay a cancel that was requested while the worker was still
	// a placeholder. Fires after releasing progressMu so cancel() —
	// which cascades through ctx listeners — can't deadlock with a
	// future progress append.
	if pending {
		cancel()
	}
}

// runGuardedWorker is the goroutine body for guard-aware async
// jobs. Mirrors runWorker's structure but hands the terminal
// outcome to guard.Release rather than writing the row directly —
// the guard's lock-holder goroutine handles the write while still
// holding the advisory lock, closing the race window where a
// concurrent Begin could observe status=running flip to terminal
// between the status write and the lock release.
//
// Panic-safe on two layers: invokeWorkerFn recovers panics inside
// the user-supplied fn, AND the outer defer guarantees Release
// fires even if our wrapper code (progressAppenderFor,
// UpdateOperationJobStatus, resolveGuardedOutcome) panics for any
// reason. Without the outer defer a wrapper panic would skip
// Release, leave the advisory lock held, and strand the row at
// status=running. Cancellation (ctx.Done() fired) wins over
// success.
func (m *JobManager) runGuardedWorker(
	ctx context.Context,
	guard *OperationGuard,
	resultPath string,
	fn WorkerFunc,
) {
	// outcome defaults to failed so a panic between here and the
	// end of the function still releases the guard with a sensible
	// terminal status. The happy path overwrites it just before
	// returning.
	outcome := JobOutcome{
		Status: sdkmodels.OperationJobStatusFailed,
		Error:  "worker exited without recording an outcome",
	}
	defer func() {
		if r := recover(); r != nil {
			// A panic in wrapper code (invokeWorkerFn's own panic
			// barrier handles user-fn panics separately). Log and
			// record as failed so the guard-backed row transitions
			// to terminal. Do not rethrow — one buggy wrapper path
			// must not crash the whole connector pod.
			m.logger.ErrorContext(ctx,
				"runGuardedWorker wrapper panic recovered",
				"job_id", guard.jobID,
				"panic", fmt.Sprintf("%v", r),
			)
			outcome = JobOutcome{
				Status: sdkmodels.OperationJobStatusFailed,
				Error:  fmt.Sprintf("worker wrapper panic: %v", r),
			}
		}
		guard.Release(outcome)
	}()

	// Resolve the worker bookkeeping handle for the progress
	// appender. linkWorkerCancel guarantees the entry exists.
	m.mu.Lock()
	worker, ok := m.workers[guard.jobID]
	m.mu.Unlock()
	if !ok {
		// Shouldn't happen — linkWorkerCancel installs on every
		// code path — but guard against it so a lost entry
		// surfaces clearly instead of nil-dereferencing. The
		// deferred Release above picks up the outcome below.
		m.logger.ErrorContext(ctx,
			"runGuardedWorker: worker entry missing; releasing guard as failed",
			"job_id", guard.jobID,
		)
		outcome = JobOutcome{
			Status: sdkmodels.OperationJobStatusFailed,
			Error:  "internal: worker bookkeeping entry missing",
		}
		return
	}
	defer worker.closeDone()

	// Transition pending → running so the first status poll after
	// the 202 sees motion.
	if err := m.db.UpdateOperationJobStatus(
		guard.jobID, string(sdkmodels.OperationJobStatusRunning), nil, nil, nil,
	); err != nil {
		m.logger.ErrorContext(ctx,
			"failed to transition job to running",
			"job_id", guard.jobID,
			"error", err,
		)
	}

	appendProgress := m.progressAppenderFor(ctx, guard.jobID, worker)
	fnErr := m.invokeWorkerFn(ctx, guard.jobID, fn, appendProgress, resultPath)

	outcome = resolveGuardedOutcome(ctx, fnErr, resultPath)
}

// resolveGuardedOutcome mirrors resolveTerminalState but expresses
// the result as a JobOutcome for the guard API. Cancel wins over
// fn-returned errors and over success — the client asked us to
// stop, so we stopped.
func resolveGuardedOutcome(ctx context.Context, fnErr error, resultPath string) JobOutcome {
	if ctx.Err() != nil {
		return JobOutcome{Status: sdkmodels.OperationJobStatusCancelled}
	}
	if fnErr != nil {
		return JobOutcome{
			Status: sdkmodels.OperationJobStatusFailed,
			Error:  fnErr.Error(),
		}
	}
	return JobOutcome{
		Status:     sdkmodels.OperationJobStatusComplete,
		ResultPath: resultPath,
	}
}

// runWorker is the per-job goroutine body. Responsible for marking
// status=running, calling fn, translating fn's return into the
// terminal DB state, and cleaning up in-memory worker state.
//
// The function is panic-safe: a panic inside fn is recovered, logged
// at Error, and converted into a terminal status=failed transition
// so the row never sticks at running. The panic value is NOT
// rethrown — a single bad provider must not take down the pod.
func (m *JobManager) runWorker(
	ctx context.Context,
	jobID string,
	worker *jobWorker,
	resultPath string,
	fn WorkerFunc,
) {
	defer worker.closeDone()

	// Transition pending → running before calling fn so the first
	// status poll after the 202 sees movement. We do not set
	// ExpiresAt yet — in-flight jobs never expire, only terminal
	// ones do.
	if err := m.db.UpdateOperationJobStatus(
		jobID, string(sdkmodels.OperationJobStatusRunning), nil, nil, nil,
	); err != nil {
		m.logger.ErrorContext(ctx,
			"failed to transition job to running",
			"job_id", jobID,
			"error", err,
		)
	}

	appendProgress := m.progressAppenderFor(ctx, jobID, worker)

	fnErr := m.invokeWorkerFn(ctx, jobID, fn, appendProgress, resultPath)

	// Compute terminal state. Cancel wins over success so a worker
	// that happened to finish exactly at the cancel instant still
	// reports cancelled — the client asked us to stop, we stopped.
	terminalStatus, errMsg, storedResultPath := resolveTerminalState(ctx, fnErr, resultPath)

	expires := time.Now().Add(m.cfg.TTL)
	if updateErr := m.db.UpdateOperationJobStatus(
		jobID,
		string(terminalStatus),
		&errMsg,
		&storedResultPath,
		&expires,
	); updateErr != nil {
		m.logger.ErrorContext(ctx,
			"failed to transition job to terminal state",
			"job_id", jobID,
			"status", terminalStatus,
			"error", updateErr,
		)
	}

	// Tidy in-memory state. We keep the jobWorker in the map even
	// after the goroutine exits so Cancel calls arriving late remain
	// idempotent — the cancel() is a no-op once context is already
	// done. The janitor removes the map entry when it reaps the row.
}

// progressAppenderFor returns the thread-safe append callback a
// worker hands to its provider's ProgressHandler. Extracted so both
// the legacy runWorker and the guard-aware runGuardedWorker share
// exactly one implementation — keeping them in lockstep as the
// progress protocol evolves.
func (m *JobManager) progressAppenderFor(
	ctx context.Context,
	jobID string,
	worker *jobWorker,
) func(sdkprogress.ProgressEvent) {
	return func(ev sdkprogress.ProgressEvent) {
		worker.progressMu.Lock()
		worker.progress = append(worker.progress, ev)
		// Snapshot under the lock so concurrent appends don't
		// interleave into a malformed JSON (a slice append that
		// re-grows races with the marshal otherwise).
		snapshot := make([]sdkprogress.ProgressEvent, len(worker.progress))
		copy(snapshot, worker.progress)
		worker.progressMu.Unlock()

		encoded, marshalErr := json.Marshal(snapshot)
		if marshalErr != nil {
			m.logger.ErrorContext(ctx,
				"failed to marshal progress snapshot",
				"job_id", jobID,
				"error", marshalErr,
			)
			return
		}
		if updateErr := m.db.UpdateOperationJobProgress(jobID, encoded); updateErr != nil {
			m.logger.ErrorContext(ctx,
				"failed to persist progress",
				"job_id", jobID,
				"error", updateErr,
			)
		}
	}
}

// invokeWorkerFn calls the user-supplied WorkerFunc with a panic
// barrier. A panic is converted into an error so the caller's
// terminal-state computation treats it as a failed outcome rather
// than letting the stack unwind past runWorker / runGuardedWorker
// and leave the row at status=running. Returns nil on clean fn exit
// with no error, fn's return otherwise, or a synthesised error
// containing the recovered panic value.
func (m *JobManager) invokeWorkerFn(
	ctx context.Context,
	jobID string,
	fn WorkerFunc,
	appendProgress func(sdkprogress.ProgressEvent),
	resultPath string,
) (retErr error) {
	defer func() {
		if r := recover(); r != nil {
			m.logger.ErrorContext(ctx,
				"worker panic recovered",
				"job_id", jobID,
				"panic", fmt.Sprintf("%v", r),
			)
			retErr = fmt.Errorf("worker panic: %v", r)
		}
	}()
	return fn(ctx, appendProgress, resultPath)
}

// resolveTerminalState computes the (status, error message, result
// path) triple written on worker exit. Pure function so the branch
// ordering is easy to audit — the cancel-wins rule is the subtle bit.
func resolveTerminalState(
	ctx context.Context,
	fnErr error,
	resultPath string,
) (sdkmodels.OperationJobStatus, string, string) {
	if ctx.Err() != nil {
		// Cancelled takes precedence over any fn-returned error or
		// success: the client asked us to stop, so we stopped.
		return sdkmodels.OperationJobStatusCancelled, "", ""
	}
	if fnErr != nil {
		return sdkmodels.OperationJobStatusFailed, fnErr.Error(), ""
	}
	return sdkmodels.OperationJobStatusComplete, "", resultPath
}

// Cancel marks a job for cancellation. Returns true if the job was
// known to this manager (and the context was cancelled), false if the
// job ID is not tracked (either unknown or already reaped). Idempotent:
// a second Cancel call on a job whose worker has already exited
// returns true and no-ops.
//
// Prefer CancelWithOutcome for new handler code — it reports whether
// the live worker's context was actually signalled (vs. a no-op
// against a placeholder or already-exited worker), which the
// structured cancel response exposes as was_active.
func (m *JobManager) Cancel(jobID string) bool {
	_, tracked := m.CancelWithOutcome(jobID)
	return tracked
}

// CancelWithOutcome is the enriched form of Cancel. Returns (active,
// tracked): active is true when a non-placeholder worker's cancel fn
// was invoked — i.e., there is actually a live worker goroutine that
// will observe the ctx cancellation and wind down. tracked is true
// when any entry existed in the in-memory worker map, including
// placeholders and already-exited workers; false only for unknown
// or janitor-reaped job IDs.
//
// Handlers surface active as was_active on the cancel response so
// clients can tell "we signalled a running worker" apart from "no-op
// against a terminal row".
func (m *JobManager) CancelWithOutcome(jobID string) (bool, bool) {
	m.mu.Lock()
	worker, ok := m.workers[jobID]
	m.mu.Unlock()
	if !ok {
		return false, false
	}
	// Capture both isPlaceholder AND the cancel fn under the same
	// lock that linkWorkerCancel uses to write them. Without this,
	// the cancel-fn read races the placeholder → live promotion
	// write (the race detector flags it; Go's memory model would
	// permit reading a torn pointer value). Call the captured fn
	// after releasing the lock so cancel() — which may acquire its
	// own locks on ctx cancellation paths — can't deadlock with the
	// progress append path.
	//
	// If we're cancelling a placeholder, also set cancelPending so
	// linkWorkerCancel fires the real cancel when the worker
	// goroutine takes over. Without this, a cancel arriving in the
	// narrow window between Begin and StartJobWithGuard would be
	// silently dropped against the no-op placeholder cancel.
	worker.progressMu.Lock()
	active := !worker.isPlaceholder
	cancel := worker.cancel
	if !active {
		worker.cancelPending = true
	}
	worker.progressMu.Unlock()
	cancel()
	return active, true
}

// WaitForJob blocks until the worker for jobID has exited, or until
// ctx is done. Returns nil on a clean worker exit, ctx.Err on
// cancellation/deadline. Unknown job IDs return nil immediately — the
// worker is already gone, treat it as done.
//
// Useful for tests; not used on the hot path.
func (m *JobManager) WaitForJob(ctx context.Context, jobID string) error {
	m.mu.Lock()
	worker, ok := m.workers[jobID]
	m.mu.Unlock()
	if !ok {
		return nil
	}
	select {
	case <-worker.done:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// Snapshot returns the current in-memory progress slice and the
// persisted status row. The status row is always fetched from the DB
// so a caller hitting this right after StartJob sees the running
// transition even if the worker goroutine hasn't emitted any progress
// yet. If the DB lookup returns NotFound, the (row, err) pair carries
// that upward so the handler can surface 404.
func (m *JobManager) Snapshot(jobID string) (*db.OperationJob, []sdkprogress.ProgressEvent, error) {
	row, err := m.db.GetOperationJob(jobID)
	if err != nil {
		return nil, nil, err
	}

	// Prefer the live in-memory slice when the worker is still
	// tracked — it reflects events that may not yet have flushed to
	// the DB column. Fall back to the persisted JSON otherwise.
	m.mu.Lock()
	worker := m.workers[jobID]
	m.mu.Unlock()

	if worker != nil {
		worker.progressMu.Lock()
		snapshot := make([]sdkprogress.ProgressEvent, len(worker.progress))
		copy(snapshot, worker.progress)
		worker.progressMu.Unlock()
		return row, snapshot, nil
	}

	var events []sdkprogress.ProgressEvent
	if len(row.Progress) > 0 {
		if unmarshalErr := json.Unmarshal(row.Progress, &events); unmarshalErr != nil {
			// Malformed persisted JSON — log and return empty
			// rather than failing the whole status call.
			m.logger.Warn(
				"failed to unmarshal persisted progress",
				"job_id", jobID,
				"error", unmarshalErr,
			)
			events = nil
		}
	}
	return row, events, nil
}

// StartJanitor launches the periodic GC goroutine. Safe to call
// multiple times — only the first call has effect, so startup code
// can invoke it unconditionally. The janitor runs until StopJanitor
// is called or the process exits.
func (m *JobManager) StartJanitor() {
	m.janitorOnce.Do(func() {
		go m.janitorLoop()
	})
}

// StopJanitor signals the janitor goroutine to exit. Idempotent; a
// second call is a no-op. Intended for graceful shutdown tests — in
// production, the process exit handles it.
func (m *JobManager) StopJanitor() {
	// Guard against double-close on repeat calls.
	defer func() { _ = recover() }()
	close(m.janitorStop)
}

func (m *JobManager) janitorLoop() {
	ticker := time.NewTicker(m.cfg.JanitorInterval)
	defer ticker.Stop()
	for {
		select {
		case <-m.janitorStop:
			return
		case <-ticker.C:
			m.RunJanitor()
		}
	}
}

// RunJanitor executes one GC pass. Exposed for tests so they can
// drive the janitor deterministically instead of waiting on the
// ticker. Swallows per-row errors (logs only) because a single bad
// row must not block cleanup of the rest.
//
// Two reclaim passes run on each tick:
//
//  1. Expired-TTL pass: rows whose ExpiresAt is in the past are
//     deleted and their result files unlinked. This is the only
//     path that removes DB rows outright.
//  2. Stuck-row pass: rows still in pending/running whose
//     updated_at is older than cfg.StuckThreshold have their
//     advisory lock probed. If the probe acquires (i.e., the
//     original holder's PG connection is gone), the row is marked
//     failed so /operation/status reports a terminal state instead
//     of sticking at running indefinitely.
func (m *JobManager) RunJanitor() {
	now := time.Now()
	m.reapExpiredJobs(now)
	m.reclaimStuckJobs(now)
}

// reapExpiredJobs is the pre-existing TTL-driven path: expired
// rows are deleted from the DB and their result zips unlinked.
func (m *JobManager) reapExpiredJobs(now time.Time) {
	expired, err := m.db.ListExpiredOperationJobs(now)
	if err != nil {
		m.logger.Error("janitor list failed", "error", err)
		return
	}
	for _, job := range expired {
		if job.ResultPath != "" {
			if rmErr := os.Remove(job.ResultPath); rmErr != nil && !errors.Is(rmErr, os.ErrNotExist) {
				m.logger.Warn(
					"janitor failed to remove result file",
					"job_id", job.JobID,
					"path", job.ResultPath,
					"error", rmErr,
				)
			}
		}

		// Drop in-memory worker bookkeeping too. The worker
		// goroutine is guaranteed to have exited before ExpiresAt
		// was set (the terminal-status write installs ExpiresAt),
		// so forgetting the entry is safe.
		m.mu.Lock()
		delete(m.workers, job.JobID)
		m.mu.Unlock()
	}
	if deleted, delErr := m.db.DeleteExpiredOperationJobs(now); delErr != nil {
		m.logger.Error("janitor delete failed", "error", delErr)
	} else if deleted > 0 {
		m.logger.Info("janitor reaped expired jobs", "count", deleted)
	}
}

// reclaimStuckJobs is the layer-B reclaim path: a worker that
// vanished (pod crash, SIGKILL) leaves a row at status=running
// indefinitely because the terminal-transition write never
// happens. The janitor finds these and marks them failed, but
// only if the advisory lock probes free — a slow-but-alive
// worker keeps the lock, and we must not clobber its in-progress
// state.
//
// Heartbeat writes (every 30s by default via
// UpdateOperationJobProgress) bump updated_at; StuckThreshold
// defaults to 30 minutes, so a live worker has ~60 heartbeats of
// slack before ever being considered stuck.
func (m *JobManager) reclaimStuckJobs(now time.Time) {
	if m.cfg.StuckThreshold <= 0 {
		return
	}
	threshold := now.Add(-m.cfg.StuckThreshold)
	stuck, err := m.db.ListStuckOperationJobs(threshold)
	if err != nil {
		m.logger.Error("janitor stuck list failed", "error", err)
		return
	}

	var reclaimed int
	for _, job := range stuck {
		if m.reclaimOneStuckJob(job, now) {
			reclaimed++
		}
	}
	if reclaimed > 0 {
		m.logger.Info("janitor reclaim pass complete", "reclaimed", reclaimed)
	}
}

// reclaimOneStuckJob atomically probes the advisory lock and
// transitions a stuck row to failed. Returns true if the row was
// actually reclaimed; false if the lock is still held by a live
// worker, if the row has since reached a terminal state on its own,
// or on transient errors.
//
// The re-read and the status write happen INSIDE the lock callback
// to close a TOCTOU race: between ListStuckOperationJobs and our
// lock probe, a legitimately completing worker could write its
// terminal status and release the lock. A naive "probe then write"
// would see the lock free and clobber the completed row's status
// with failed, stranding the result.
func (m *JobManager) reclaimOneStuckJob(job db.OperationJob, now time.Time) bool {
	var didReclaim bool
	acquired, lockErr := m.db.WithOperationExecutionLock(
		job.OperationID,
		func(_ *gorm.DB) error {
			// Re-read the row under the lock. A legitimate worker
			// may have completed between ListStuckOperationJobs and
			// here — in which case we must NOT overwrite its
			// terminal status.
			current, readErr := m.db.GetOperationJob(job.JobID)
			if readErr != nil {
				m.logger.Warn(
					"janitor re-read failed; skipping reclaim",
					"job_id", job.JobID,
					"error", readErr,
				)
				return nil
			}
			if sdkmodels.OperationJobStatus(current.Status).IsTerminal() {
				// Row transitioned on its own between the List and
				// our lock acquisition — nothing to reclaim.
				return nil
			}

			errMsg := fmt.Sprintf(
				"worker vanished (no updates for > %s; reclaimed by janitor)",
				m.cfg.StuckThreshold,
			)
			expires := now.Add(m.cfg.TTL)
			emptyPath := ""
			if updateErr := m.db.UpdateOperationJobStatus(
				job.JobID,
				string(sdkmodels.OperationJobStatusFailed),
				&errMsg,
				&emptyPath,
				&expires,
			); updateErr != nil {
				m.logger.Error(
					"janitor failed to reclaim stuck job",
					"job_id", job.JobID,
					"error", updateErr,
				)
				return nil
			}
			didReclaim = true
			m.logger.Warn(
				"janitor reclaimed stuck job",
				"job_id", job.JobID,
				"operation_id", job.OperationID,
			)
			return nil
		},
	)
	if lockErr != nil {
		m.logger.Warn(
			"janitor stuck-probe lock attempt failed",
			"job_id", job.JobID,
			"operation_id", job.OperationID,
			"error", lockErr,
		)
		return false
	}
	if !acquired {
		// Live holder; skip.
		return false
	}
	if didReclaim {
		// Also drop any in-memory worker bookkeeping — the worker
		// is dead by definition.
		m.mu.Lock()
		delete(m.workers, job.JobID)
		m.mu.Unlock()
	}
	return didReclaim
}

// getJob is a thin accessor for the persisted row, exposed so the
// HTTP handlers don't reach into m.db directly — lets the JobStore
// interface stay private to the manager's own file.
func (m *JobManager) getJob(jobID string) (*db.OperationJob, error) {
	return m.db.GetOperationJob(jobID)
}

// generateJobID returns a prefixed hex-encoded random string. The
// jobIDPrefix gives logs and errors a visual marker; the hex suffix
// carries DefaultJobIDByteLen bytes of entropy.
func generateJobID() (string, error) {
	buf := make([]byte, DefaultJobIDByteLen)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return jobIDPrefix + hex.EncodeToString(buf), nil
}

// jobOperationTokenByteLen is the entropy budget for the per-job
// operation token. 32 bytes (256 bits) hex-encoded gives a 64-char
// opaque bearer — comfortably above any practical brute-force ceiling
// inside the token's 15-minute lifetime, and shaped to fit the
// operation_jobs.operation_token column's varchar(64) cap exactly.
const jobOperationTokenByteLen = 32

// generateJobOperationToken returns the opaque bearer the connector
// service hands back to Core in the 202 Start* response and accepts
// on the per-job lifecycle routes. Distinct from generateJobID: the
// job id is observable on logs and the wire (operators paste it into
// dashboards), so it's prefixed for visual marker. The token is a
// credential — no prefix, no structure, just entropy — so it leaks
// less when copied into logs by accident.
func generateJobOperationToken() (string, error) {
	buf := make([]byte, jobOperationTokenByteLen)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
