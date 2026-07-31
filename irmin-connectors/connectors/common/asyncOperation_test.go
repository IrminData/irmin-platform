//nolint:testpackage,govet // white-box test — exercises the unexported JobManager internals (jobWorker map, runWorker, janitor) which are deliberately package-private; the repeated `if err := ...` idiom is intentional test style.
package common

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"sync"
	"testing"
	"time"

	"irmin-connectors/db"

	sdkmodels "github.com/IrminData/irmin-sdk-go/models"
	sdkprogress "github.com/IrminData/irmin-sdk-go/observability"
	"gorm.io/gorm"
)

// memJobStore is the in-memory JobStore used by every test in this
// file. Rows are keyed by job_id; the mutex keeps concurrent
// AppendProgress / UpdateStatus / janitor calls honest.
//
// locks models the PG advisory lock — a set of operation IDs
// currently held. WithOperationExecutionLock takes the set's mutex,
// checks membership, and runs fn under the held slot. This matches
// the "only one call holds the lock per operation" invariant the
// production pg_advisory_lock provides.
type memJobStore struct {
	mu   sync.Mutex
	jobs map[string]*db.OperationJob

	lockMu sync.Mutex
	locks  map[uint]bool

	// logsMu guards opLogs. Tests that assert on the cancellation
	// audit trail read this slice; production code only writes.
	logsMu sync.Mutex
	opLogs []*db.OperationLog
}

func newMemJobStore() *memJobStore {
	return &memJobStore{
		jobs:  make(map[string]*db.OperationJob),
		locks: make(map[uint]bool),
	}
}

// CreateOperationLog records the log row in memory so tests can
// assert on cancellation audit entries without a real database. The
// store does not assign IDs — tests that need them can fill the
// gorm.Model fields via the returned pointer.
func (s *memJobStore) CreateOperationLog(operationLog *db.OperationLog) (*db.OperationLog, error) {
	s.logsMu.Lock()
	defer s.logsMu.Unlock()
	cp := *operationLog
	s.opLogs = append(s.opLogs, &cp)
	return operationLog, nil
}

// operationLogs returns a snapshot copy of the recorded log rows so
// callers can assert on them without racing the manager.
func (s *memJobStore) operationLogs() []*db.OperationLog {
	s.logsMu.Lock()
	defer s.logsMu.Unlock()
	out := make([]*db.OperationLog, len(s.opLogs))
	copy(out, s.opLogs)
	return out
}

func (s *memJobStore) CreateOperationJob(job *db.OperationJob) (*db.OperationJob, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	// Mirror GORM's behaviour: fill CreatedAt/UpdatedAt so the
	// manager's terminal-transition path sees consistent
	// timestamps.
	now := time.Now()
	if job.CreatedAt.IsZero() {
		job.CreatedAt = now
	}
	job.UpdatedAt = now
	cp := *job
	s.jobs[job.JobID] = &cp
	return job, nil
}

func (s *memJobStore) GetOperationJob(jobID string) (*db.OperationJob, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	row, ok := s.jobs[jobID]
	if !ok {
		return nil, gorm.ErrRecordNotFound
	}
	cp := *row
	return &cp, nil
}

func (s *memJobStore) UpdateOperationJobStatus(
	jobID string,
	status string,
	errMsg *string,
	resultPath *string,
	expiresAt *time.Time,
) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	row, ok := s.jobs[jobID]
	if !ok {
		return gorm.ErrRecordNotFound
	}
	row.Status = status
	if errMsg != nil {
		row.Error = *errMsg
	}
	if resultPath != nil {
		row.ResultPath = *resultPath
	}
	if expiresAt != nil {
		row.ExpiresAt = expiresAt
	}
	row.UpdatedAt = time.Now()
	return nil
}

func (s *memJobStore) UpdateOperationJobProgress(jobID string, progressJSON []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	row, ok := s.jobs[jobID]
	if !ok {
		return gorm.ErrRecordNotFound
	}
	row.Progress = append([]byte(nil), progressJSON...)
	return nil
}

func (s *memJobStore) DeleteExpiredOperationJobs(now time.Time) (int64, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var deleted int64
	for id, row := range s.jobs {
		if row.ExpiresAt != nil && row.ExpiresAt.Before(now) {
			delete(s.jobs, id)
			deleted++
		}
	}
	return deleted, nil
}

func (s *memJobStore) ListExpiredOperationJobs(now time.Time) ([]db.OperationJob, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var out []db.OperationJob
	for _, row := range s.jobs {
		if row.ExpiresAt != nil && row.ExpiresAt.Before(now) {
			out = append(out, *row)
		}
	}
	return out, nil
}

// FindActiveOperationJob returns the most recently-created
// pending/running job for operationID, mirroring the production
// query. Tests rely on this to verify the 409 AlreadyRunningError
// surfaces the right JobID.
func (s *memJobStore) FindActiveOperationJob(operationID uint) (*db.OperationJob, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var best *db.OperationJob
	for _, row := range s.jobs {
		if row.OperationID != operationID {
			continue
		}
		if row.Status != string(sdkmodels.OperationJobStatusPending) &&
			row.Status != string(sdkmodels.OperationJobStatusRunning) {
			continue
		}
		if best == nil || row.CreatedAt.After(best.CreatedAt) {
			best = row
		}
	}
	if best == nil {
		return nil, gorm.ErrRecordNotFound
	}
	cp := *best
	return &cp, nil
}

// ListStuckOperationJobs returns pending/running jobs whose
// updated_at is older than threshold — matches the production
// query used by the janitor's stuck-reclaim path.
func (s *memJobStore) ListStuckOperationJobs(threshold time.Time) ([]db.OperationJob, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	var out []db.OperationJob
	for _, row := range s.jobs {
		if row.Status != string(sdkmodels.OperationJobStatusPending) &&
			row.Status != string(sdkmodels.OperationJobStatusRunning) {
			continue
		}
		if row.UpdatedAt.Before(threshold) {
			out = append(out, *row)
		}
	}
	return out, nil
}

// WithOperationExecutionLock models the PG advisory lock
// semantics: only one goroutine holds the lock per operationID at
// a time. Returns (false, nil) when the lock is already held —
// matches pg_try_advisory_lock on a contending session. fn runs
// with the lock held; the lock is released when fn returns.
func (s *memJobStore) WithOperationExecutionLock(
	operationID uint,
	fn func(conn *gorm.DB) error,
) (bool, error) {
	s.lockMu.Lock()
	if s.locks[operationID] {
		s.lockMu.Unlock()
		return false, nil
	}
	s.locks[operationID] = true
	s.lockMu.Unlock()

	defer func() {
		s.lockMu.Lock()
		delete(s.locks, operationID)
		s.lockMu.Unlock()
	}()
	return true, fn(nil)
}

// newTestManager wires a JobManager against an in-memory store and a
// freshly allocated result directory, so test runs don't trample
// /tmp/irmin-connectors between iterations. The returned cleanup is
// registered via t.Cleanup so we can't forget to stop the janitor
// goroutine.
func newTestManager(t *testing.T) (*JobManager, *memJobStore) {
	t.Helper()
	store := newMemJobStore()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	m := NewJobManagerWithStore(store, logger, JobManagerConfig{
		TTL:             200 * time.Millisecond,
		JanitorInterval: 24 * time.Hour, // effectively off; we drive via RunJanitor
		ResultDir:       t.TempDir(),
	})
	t.Cleanup(m.StopJanitor)
	return m, store
}

type failTerminalStatusStore struct {
	*memJobStore
}

func (s *failTerminalStatusStore) UpdateOperationJobStatus(
	jobID string,
	status string,
	errMsg *string,
	resultPath *string,
	expiresAt *time.Time,
) error {
	if status == string(sdkmodels.OperationJobStatusRunning) {
		return s.memJobStore.UpdateOperationJobStatus(jobID, status, errMsg, resultPath, expiresAt)
	}
	return errors.New("terminal status update failed")
}

// TestStartJobHappyPath covers the end-to-end happy-path: StartJob
// returns a record, the worker runs fn, the row transitions to
// complete, the result file exists. This is the pre-flight shape for
// the full SDK round-trip.
func TestStartJobHappyPath(t *testing.T) {
	m, store := newTestManager(t)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	var workerRan bool
	fn := func(_ context.Context, _ func(sdkprogress.ProgressEvent), resultPath string) error {
		workerRan = true
		// Write a tiny placeholder so the result file check below
		// exercises the success path.
		return os.WriteFile(resultPath, []byte("test"), 0o600)
	}

	job, err := m.StartJob(ctx, 1, "test-connector", 42, fn)
	if err != nil {
		t.Fatalf("StartJob failed: %v", err)
	}
	if job.JobID == "" {
		t.Fatalf("StartJob returned empty JobID")
	}
	if job.ResultPath != "" {
		t.Fatalf("StartJob should not persist ResultPath before worker succeeds")
	}

	if err := m.WaitForJob(ctx, job.JobID); err != nil {
		t.Fatalf("WaitForJob failed: %v", err)
	}
	if !workerRan {
		t.Fatalf("worker did not run")
	}

	row, err := store.GetOperationJob(job.JobID)
	if err != nil {
		t.Fatalf("fetching row after run failed: %v", err)
	}
	if row.Status != string(sdkmodels.OperationJobStatusComplete) {
		t.Fatalf("expected complete, got %q", row.Status)
	}
	if row.ResultPath == "" {
		t.Fatalf("expected ResultPath to be set on complete")
	}
	if _, err := os.Stat(row.ResultPath); err != nil {
		t.Fatalf("result file missing: %v", err)
	}
	if row.ExpiresAt == nil {
		t.Fatalf("expected ExpiresAt to be set on terminal transition")
	}
}

// TestStartJobFailed checks the failed-state transition: the row
// carries the error string and no ResultPath. This is what Core's
// poll loop sees when a connector throws mid-pull.
func TestStartJobFailed(t *testing.T) {
	m, store := newTestManager(t)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	sentinel := errors.New("boom")
	fn := func(_ context.Context, _ func(sdkprogress.ProgressEvent), _ string) error {
		return sentinel
	}

	job, err := m.StartJob(ctx, 1, "", 0, fn)
	if err != nil {
		t.Fatalf("StartJob failed: %v", err)
	}
	if job.ResultPath != "" {
		t.Fatalf("StartJob should leave ResultPath empty until worker succeeds")
	}

	if err := m.WaitForJob(ctx, job.JobID); err != nil {
		t.Fatalf("WaitForJob: %v", err)
	}

	row, _ := store.GetOperationJob(job.JobID)
	if row.Status != string(sdkmodels.OperationJobStatusFailed) {
		t.Fatalf("want failed, got %q", row.Status)
	}
	if row.Error != sentinel.Error() {
		t.Fatalf("want error %q, got %q", sentinel.Error(), row.Error)
	}
	if row.ResultPath != "" {
		t.Fatalf("failed job should clear ResultPath, got %q", row.ResultPath)
	}
}

// TestStartJobCancellation covers the cancel-wins-over-completion
// contract. A worker that calls Cancel mid-run and then returns nil
// still surfaces as cancelled because we don't want a race between
// client cancel and fn exit to leave the job in "complete".
func TestStartJobCancellation(t *testing.T) {
	m, store := newTestManager(t)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	start := make(chan struct{})
	fn := func(workerCtx context.Context, _ func(sdkprogress.ProgressEvent), _ string) error {
		close(start)
		// Block until the cancel signal arrives. Returning nil after
		// cancel should still produce a cancelled terminal state.
		<-workerCtx.Done()
		return nil
	}

	job, err := m.StartJob(ctx, 1, "", 0, fn)
	if err != nil {
		t.Fatalf("StartJob failed: %v", err)
	}
	if job.ResultPath != "" {
		t.Fatalf("StartJob should leave ResultPath empty until worker succeeds")
	}

	<-start
	if !m.Cancel(job.JobID) {
		t.Fatalf("Cancel returned false for tracked job")
	}

	if err := m.WaitForJob(ctx, job.JobID); err != nil {
		t.Fatalf("WaitForJob: %v", err)
	}

	row, _ := store.GetOperationJob(job.JobID)
	if row.Status != string(sdkmodels.OperationJobStatusCancelled) {
		t.Fatalf("want cancelled, got %q", row.Status)
	}
	if row.ResultPath != "" {
		t.Fatalf("cancelled job should clear ResultPath, got %q", row.ResultPath)
	}
}

// TestTerminalStatusUpdateFailureDoesNotLeavePhantomResultPath verifies
// the stale-path bug guard: if terminal status persistence fails after
// worker exit, the row must not retain a pre-populated ResultPath.
func TestTerminalStatusUpdateFailureDoesNotLeavePhantomResultPath(t *testing.T) {
	baseStore := newMemJobStore()
	store := &failTerminalStatusStore{memJobStore: baseStore}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	m := NewJobManagerWithStore(store, logger, JobManagerConfig{
		TTL:             200 * time.Millisecond,
		JanitorInterval: 24 * time.Hour,
		ResultDir:       t.TempDir(),
	})
	t.Cleanup(m.StopJanitor)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	sentinel := errors.New("worker failed before writing result")
	fn := func(_ context.Context, _ func(sdkprogress.ProgressEvent), _ string) error {
		return sentinel
	}

	job, err := m.StartJob(ctx, 1, "", 0, fn)
	if err != nil {
		t.Fatalf("StartJob failed: %v", err)
	}
	if err := m.WaitForJob(ctx, job.JobID); err != nil {
		t.Fatalf("WaitForJob: %v", err)
	}

	row, err := baseStore.GetOperationJob(job.JobID)
	if err != nil {
		t.Fatalf("GetOperationJob failed: %v", err)
	}
	if row.Status != string(sdkmodels.OperationJobStatusRunning) {
		t.Fatalf("expected row to stay in running when terminal update fails, got %q", row.Status)
	}
	if row.ResultPath != "" {
		t.Fatalf("expected empty ResultPath after terminal update failure, got %q", row.ResultPath)
	}
}

// TestConcurrentAppendProgress fires N progress events from N
// goroutines into a single worker and asserts the persisted slice
// contains every event. Without the manager's progressMu this test
// catches a slice-append race on a modern Go runtime reliably.
func TestConcurrentAppendProgress(t *testing.T) {
	m, store := newTestManager(t)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	const workers = 20
	const perWorker = 50

	ready := make(chan struct{})
	release := make(chan struct{})

	fn := func(_ context.Context, appendProgress func(sdkprogress.ProgressEvent), resultPath string) error {
		var wg sync.WaitGroup
		wg.Add(workers)
		close(ready)
		for i := range workers {
			go func(idx int) {
				defer wg.Done()
				<-release
				for j := range perWorker {
					appendProgress(sdkprogress.ProgressEvent{
						Kind:         sdkprogress.ProgressKindPage,
						Page:         idx*perWorker + j,
						ResourcePath: "test",
					})
				}
			}(i)
		}
		wg.Wait()
		return os.WriteFile(resultPath, []byte{}, 0o600)
	}

	job, err := m.StartJob(ctx, 1, "", 0, fn)
	if err != nil {
		t.Fatalf("StartJob: %v", err)
	}
	<-ready
	close(release)

	if err := m.WaitForJob(ctx, job.JobID); err != nil {
		t.Fatalf("WaitForJob: %v", err)
	}

	row, _ := store.GetOperationJob(job.JobID)
	var events []sdkprogress.ProgressEvent
	if err := json.Unmarshal(row.Progress, &events); err != nil {
		t.Fatalf("unmarshal progress: %v", err)
	}
	if got, want := len(events), workers*perWorker; got != want {
		t.Fatalf("event count: got %d, want %d", got, want)
	}
}

// TestResultNotReadyThenReady walks the 409 → 200 transition via the
// JobManager's Snapshot + handler state, without spinning up a real
// Fiber server. Reproduces the Core poll loop's "poll status; when
// terminal, fetch result" contract.
func TestResultNotReadyThenReady(t *testing.T) {
	m, _ := newTestManager(t)

	gate := make(chan struct{})
	fn := func(_ context.Context, _ func(sdkprogress.ProgressEvent), resultPath string) error {
		<-gate
		return os.WriteFile(resultPath, []byte("done"), 0o600)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	job, err := m.StartJob(ctx, 1, "", 0, fn)
	if err != nil {
		t.Fatalf("StartJob: %v", err)
	}

	// Before release: status is pending/running, not complete.
	row, _, err := m.Snapshot(job.JobID)
	if err != nil {
		t.Fatalf("Snapshot: %v", err)
	}
	if row.Status == string(sdkmodels.OperationJobStatusComplete) {
		t.Fatalf("premature complete status")
	}

	close(gate)
	if err := m.WaitForJob(ctx, job.JobID); err != nil {
		t.Fatalf("WaitForJob: %v", err)
	}

	row, _, err = m.Snapshot(job.JobID)
	if err != nil {
		t.Fatalf("Snapshot after wait: %v", err)
	}
	if row.Status != string(sdkmodels.OperationJobStatusComplete) {
		t.Fatalf("expected complete, got %q", row.Status)
	}
}

// TestJanitorReapsExpired drives the janitor by hand and asserts it
// deletes the DB row and unlinks the result file. The 15m production
// TTL is shortcutted to sub-millisecond via JobManagerConfig.TTL so
// the test doesn't sleep.
func TestJanitorReapsExpired(t *testing.T) {
	m, store := newTestManager(t)

	// Shorten TTL inside the manager so the terminal transition
	// writes an already-past ExpiresAt.
	m.cfg.TTL = 1 * time.Millisecond

	fn := func(_ context.Context, _ func(sdkprogress.ProgressEvent), resultPath string) error {
		return os.WriteFile(resultPath, []byte("reap me"), 0o600)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	job, err := m.StartJob(ctx, 1, "", 0, fn)
	if err != nil {
		t.Fatalf("StartJob: %v", err)
	}
	if err := m.WaitForJob(ctx, job.JobID); err != nil {
		t.Fatalf("WaitForJob: %v", err)
	}

	row, _ := store.GetOperationJob(job.JobID)
	if row.ResultPath == "" {
		t.Fatalf("no result path after complete")
	}
	// Sleep briefly to ensure ExpiresAt is strictly before time.Now()
	// when the janitor runs. 10ms is enough given the 1ms TTL.
	time.Sleep(10 * time.Millisecond)

	m.RunJanitor()

	if _, err := store.GetOperationJob(job.JobID); !errors.Is(err, gorm.ErrRecordNotFound) {
		t.Fatalf("expected row to be reaped, got err=%v", err)
	}
	if _, err := os.Stat(row.ResultPath); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("expected result file %q to be removed, stat err=%v", row.ResultPath, err)
	}
}

// TestCancelUnknownJob ensures Cancel on an unknown job returns false
// and does not panic. The cancel handler uses this to route 404 vs
// 200 behaviour.
func TestCancelUnknownJob(t *testing.T) {
	m, _ := newTestManager(t)
	if m.Cancel("opjob_does_not_exist") {
		t.Fatalf("Cancel returned true for unknown job")
	}
}

// TestSnapshotUnknownJob checks the NotFound propagation so the HTTP
// handler can map to 404.
func TestSnapshotUnknownJob(t *testing.T) {
	m, _ := newTestManager(t)
	_, _, err := m.Snapshot("opjob_nope")
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		t.Fatalf("expected NotFound, got %v", err)
	}
}

// TestResultDirCreated asserts the manager lazily creates its result
// directory on first StartJob — a fresh pod's tmpfs shouldn't need an
// explicit setup step.
func TestResultDirCreated(t *testing.T) {
	m, _ := newTestManager(t)

	// Point ResultDir at a path that does NOT yet exist so
	// EnsureResultDir has something to do.
	m.cfg.ResultDir = filepath.Join(t.TempDir(), "nested", "result-dir")

	fn := func(_ context.Context, _ func(sdkprogress.ProgressEvent), resultPath string) error {
		return os.WriteFile(resultPath, []byte{}, 0o600)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	job, err := m.StartJob(ctx, 1, "", 0, fn)
	if err != nil {
		t.Fatalf("StartJob: %v", err)
	}
	if err := m.WaitForJob(ctx, job.JobID); err != nil {
		t.Fatalf("WaitForJob: %v", err)
	}

	if _, err := os.Stat(m.cfg.ResultDir); err != nil {
		t.Fatalf("result dir was not created: %v", err)
	}
}
