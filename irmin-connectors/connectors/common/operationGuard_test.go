//nolint:testpackage // white-box tests exercise the unexported Begin / OperationGuard / janitor internals.
package common

import (
	"context"
	"irmin-connectors/db"
	"strings"
	"sync"
	"testing"
	"time"

	sdkmodels "github.com/IrminData/irmin-sdk-go/models"
	sdkprogress "github.com/IrminData/irmin-sdk-go/observability"
)

// TestBeginHappyPath covers the basic acquire → Release flow:
// Begin returns a guard with a populated JobID and no conflict, the
// row exists in pending status, Release marks it terminal, and a
// second Begin (after Release) succeeds because the lock is free.
func TestBeginHappyPath(t *testing.T) {
	m, store := newTestManager(t)

	guard, alreadyErr, err := m.Begin(BeginOperationJobInput{
		OperationID:             42,
		ConnectorRegistrationID: 7,
		ConnectorName:           "test",
		Kind:                    "pull",
	})
	if err != nil || alreadyErr != nil {
		t.Fatalf("Begin failed: err=%v conflict=%v", err, alreadyErr)
	}
	if guard.JobID() == "" {
		t.Fatalf("guard has empty JobID")
	}

	row, _, snapErr := m.Snapshot(guard.JobID())
	if snapErr != nil {
		t.Fatalf("Snapshot: %v", snapErr)
	}
	if row.Status != string(sdkmodels.OperationJobStatusPending) {
		t.Fatalf("row.Status = %q, want pending", row.Status)
	}
	if row.Kind != "pull" {
		t.Fatalf("row.Kind = %q, want pull", row.Kind)
	}

	guard.Release(JobOutcome{Status: sdkmodels.OperationJobStatusComplete})

	row2, _, snap2Err := m.Snapshot(guard.JobID())
	if snap2Err != nil {
		t.Fatalf("Snapshot after Release: %v", snap2Err)
	}
	if row2.Status != string(sdkmodels.OperationJobStatusComplete) {
		t.Fatalf("row.Status after Release = %q, want complete", row2.Status)
	}

	// Lock must be free now — second Begin succeeds without conflict.
	guard2, alreadyErr2, err2 := m.Begin(BeginOperationJobInput{
		OperationID: 42,
		Kind:        "pull",
	})
	if err2 != nil || alreadyErr2 != nil {
		t.Fatalf("second Begin after Release failed: err=%v conflict=%v", err2, alreadyErr2)
	}
	t.Cleanup(func() {
		guard2.Release(JobOutcome{Status: sdkmodels.OperationJobStatusCancelled})
	})

	// And the store should contain both rows.
	store.mu.Lock()
	n := len(store.jobs)
	store.mu.Unlock()
	if n != 2 {
		t.Fatalf("expected 2 rows in store, got %d", n)
	}
}

// TestBeginConflictSurfacesBlockingJobID is the headline assertion:
// a second Begin on a locked operation returns an AlreadyRunningError
// whose JobID matches the first Begin's guard, so callers can surface
// the blocker on the 409 response without a second round-trip.
func TestBeginConflictSurfacesBlockingJobID(t *testing.T) {
	m, _ := newTestManager(t)

	first, alreadyErr, err := m.Begin(BeginOperationJobInput{
		OperationID: 1001,
		Kind:        "push",
	})
	if err != nil || alreadyErr != nil {
		t.Fatalf("first Begin failed: err=%v conflict=%v", err, alreadyErr)
	}
	t.Cleanup(func() {
		first.Release(JobOutcome{Status: sdkmodels.OperationJobStatusCancelled})
	})

	// Second Begin — same operation — must report conflict.
	second, conflict, err := m.Begin(BeginOperationJobInput{
		OperationID: 1001,
		Kind:        "push",
	})
	if err != nil {
		t.Fatalf("second Begin returned unexpected err=%v", err)
	}
	if second != nil {
		t.Fatalf("second Begin unexpectedly returned a guard while first is live")
	}
	if conflict == nil {
		t.Fatalf("second Begin should have returned a conflict")
	}
	if conflict.JobID != first.JobID() {
		t.Fatalf("conflict.JobID = %q, want %q", conflict.JobID, first.JobID())
	}
	if conflict.OperationID != 1001 {
		t.Fatalf("conflict.OperationID = %d, want 1001", conflict.OperationID)
	}
	if conflict.Kind != "push" {
		t.Fatalf("conflict.Kind = %q, want push", conflict.Kind)
	}
	if conflict.StartedAt.IsZero() {
		t.Fatalf("conflict.StartedAt should be populated from the blocking row")
	}
	// errors.As path: RespondAlreadyRunning works off the pointer directly,
	// but callers may still wrap the conflict — verify Error() is non-empty.
	if conflict.Error() == "" {
		t.Fatalf("conflict.Error() must not be empty")
	}
}

// TestReleaseIsIdempotent verifies the documented "first call wins"
// contract on Guard.Release — a second Release call must not block,
// not panic, and not alter the row's terminal state.
func TestReleaseIsIdempotent(t *testing.T) {
	m, _ := newTestManager(t)

	guard, _, err := m.Begin(BeginOperationJobInput{OperationID: 77, Kind: "pull"})
	if err != nil {
		t.Fatalf("Begin: %v", err)
	}

	guard.Release(JobOutcome{
		Status: sdkmodels.OperationJobStatusFailed,
		Error:  "first outcome",
	})

	// Second Release — different outcome — must be a no-op.
	done := make(chan struct{})
	go func() {
		guard.Release(JobOutcome{
			Status: sdkmodels.OperationJobStatusComplete,
			Error:  "second outcome",
		})
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(1 * time.Second):
		t.Fatalf("second Release blocked")
	}

	row, _, _ := m.Snapshot(guard.JobID())
	if row.Status != string(sdkmodels.OperationJobStatusFailed) {
		t.Fatalf("row.Status = %q, want failed (first Release wins)", row.Status)
	}
	if row.Error != "first outcome" {
		t.Fatalf("row.Error = %q, want first outcome", row.Error)
	}
}

// TestReleaseNormalizesNonTerminalOutcome verifies that a caller
// passing a non-terminal or zero-value Status doesn't leave the row
// stuck — the guard converts it into Failed with a descriptive
// error message.
func TestReleaseNormalizesNonTerminalOutcome(t *testing.T) {
	m, _ := newTestManager(t)

	guard, _, err := m.Begin(BeginOperationJobInput{OperationID: 88, Kind: "push"})
	if err != nil {
		t.Fatalf("Begin: %v", err)
	}

	// Zero-value Status — must be normalized to failed.
	guard.Release(JobOutcome{})

	row, _, _ := m.Snapshot(guard.JobID())
	if row.Status != string(sdkmodels.OperationJobStatusFailed) {
		t.Fatalf("row.Status = %q, want failed after zero-value Release", row.Status)
	}
	if row.Error == "" {
		t.Fatalf("row.Error must describe the normalization")
	}
}

// TestStartJobWithGuardPanicRecovery verifies the async worker
// path's panic barrier: a panic inside the WorkerFunc is recovered,
// the row transitions to failed with a "worker panic: ..." message,
// and the lock releases so a subsequent Begin succeeds.
func TestStartJobWithGuardPanicRecovery(t *testing.T) {
	m, _ := newTestManager(t)

	guard, _, err := m.Begin(BeginOperationJobInput{OperationID: 555, Kind: "pull"})
	if err != nil {
		t.Fatalf("Begin: %v", err)
	}

	fn := func(_ context.Context, _ func(sdkprogress.ProgressEvent), _ string) error {
		panic("provider went boom")
	}
	m.StartJobWithGuard(guard, fn)

	// Wait for the worker to complete its panic-recovery path.
	deadline := time.Now().Add(3 * time.Second)
	var row *finalRow
	for time.Now().Before(deadline) {
		r, _, snapErr := m.Snapshot(guard.JobID())
		if snapErr == nil && r.Status != string(sdkmodels.OperationJobStatusPending) &&
			r.Status != string(sdkmodels.OperationJobStatusRunning) {
			row = &finalRow{Status: r.Status, Error: r.Error}
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	if row == nil {
		t.Fatalf("worker never transitioned to terminal after panic")
	}
	if row.Status != string(sdkmodels.OperationJobStatusFailed) {
		t.Fatalf("row.Status = %q, want failed after panic", row.Status)
	}
	if row.Error == "" || !containsPanicMessage(row.Error) {
		t.Fatalf("row.Error = %q, want to contain panic message", row.Error)
	}

	// Lock must be free: a new Begin on the same operation succeeds.
	next, conflict, err := m.Begin(BeginOperationJobInput{
		OperationID: 555,
		Kind:        "pull",
	})
	if err != nil || conflict != nil {
		t.Fatalf("Begin after panic-recovered worker: err=%v conflict=%v", err, conflict)
	}
	next.Release(JobOutcome{Status: sdkmodels.OperationJobStatusCancelled})
}

type finalRow struct {
	Status string
	Error  string
}

func containsPanicMessage(s string) bool {
	return len(s) > 0 && (indexOf(s, "panic") >= 0 || indexOf(s, "went boom") >= 0)
}

func indexOf(s, sub string) int {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}

// TestRunGuardedWorkerWrapperPanicReleasesGuard verifies that a
// panic in the worker's wrapper code (outside the user fn's own
// panic barrier) still releases the guard. Simulated by pointing
// the store's UpdateOperationJobStatus at a hook that panics on
// the pending→running transition — this is the first wrapper call
// after the fn barrier and before resolveGuardedOutcome, so a naive
// "guard.Release as last statement" would never fire.
//
// Asserts the row transitions to failed with a wrapper-panic
// message AND the advisory lock is freed (a subsequent Begin
// succeeds).
func TestRunGuardedWorkerWrapperPanicReleasesGuard(t *testing.T) {
	m, store := newTestManager(t)
	// Wrap the store so UpdateOperationJobStatus panics on the
	// first pending→running transition but proceeds normally for
	// the later terminal-status write (invoked by the guard's
	// release path).
	panickingStore := &panicOnFirstRunningUpdate{memJobStore: store}
	m.db = panickingStore

	guard, _, err := m.Begin(BeginOperationJobInput{OperationID: 8821, Kind: "pull"})
	if err != nil {
		t.Fatalf("Begin: %v", err)
	}

	// A trivial worker fn — the panic happens in the wrapper before
	// fn gets called, so this body never runs.
	fn := func(_ context.Context, _ func(sdkprogress.ProgressEvent), _ string) error {
		return nil
	}
	m.StartJobWithGuard(guard, fn)

	// Wait for the wrapper's defer to push the row to terminal.
	deadline := time.Now().Add(3 * time.Second)
	var terminal *db.OperationJob
	for time.Now().Before(deadline) {
		r, _, snapErr := m.Snapshot(guard.JobID())
		if snapErr == nil && (r.Status == string(sdkmodels.OperationJobStatusFailed) ||
			r.Status == string(sdkmodels.OperationJobStatusComplete) ||
			r.Status == string(sdkmodels.OperationJobStatusCancelled)) {
			terminal = r
			break
		}
		time.Sleep(10 * time.Millisecond)
	}
	if terminal == nil {
		t.Fatalf("row never transitioned to terminal after wrapper panic")
	}
	if terminal.Status != string(sdkmodels.OperationJobStatusFailed) {
		t.Fatalf("row.Status = %q, want failed after wrapper panic", terminal.Status)
	}
	if !strings.Contains(terminal.Error, "wrapper panic") {
		t.Fatalf("row.Error = %q, want to mention wrapper panic", terminal.Error)
	}

	// Advisory lock must be free — a second Begin on the same
	// operation succeeds.
	next, conflict, err := m.Begin(BeginOperationJobInput{OperationID: 8821, Kind: "pull"})
	if err != nil || conflict != nil {
		t.Fatalf("Begin after wrapper-panic recovery: err=%v conflict=%v", err, conflict)
	}
	next.Release(JobOutcome{Status: sdkmodels.OperationJobStatusCancelled})
}

// panicOnFirstRunningUpdate is a memJobStore wrapper that panics
// the first time UpdateOperationJobStatus is called with
// status=running (the pending→running transition runGuardedWorker
// issues right after linking the cancel fn). All other calls
// delegate to the embedded store so the deferred Release's
// terminal write still lands.
type panicOnFirstRunningUpdate struct {
	*memJobStore
	panicked bool
	panicMu  sync.Mutex
}

func (s *panicOnFirstRunningUpdate) UpdateOperationJobStatus(
	jobID string,
	status string,
	errMsg *string,
	resultPath *string,
	expiresAt *time.Time,
) error {
	s.panicMu.Lock()
	if !s.panicked && status == string(sdkmodels.OperationJobStatusRunning) {
		s.panicked = true
		s.panicMu.Unlock()
		panic("simulated wrapper-path panic during pending→running write")
	}
	s.panicMu.Unlock()
	return s.memJobStore.UpdateOperationJobStatus(jobID, status, errMsg, resultPath, expiresAt)
}

// TestCancelWithOutcomeWasActive verifies that CancelWithOutcome
// distinguishes placeholders (Begin-only, no live worker) from
// running workers. The cancel handler surfaces this as was_active on
// the response.
func TestCancelWithOutcomeWasActive(t *testing.T) {
	m, _ := newTestManager(t)

	// Placeholder path: Begin but never StartJobWithGuard. Cancel
	// should report was_active=false because no live worker exists.
	guard, _, err := m.Begin(BeginOperationJobInput{OperationID: 311, Kind: "push"})
	if err != nil {
		t.Fatalf("Begin: %v", err)
	}
	active, tracked := m.CancelWithOutcome(guard.JobID())
	if !tracked {
		t.Fatalf("tracked = false for known job")
	}
	if active {
		t.Fatalf("active = true for placeholder-only job, want false")
	}
	guard.Release(JobOutcome{Status: sdkmodels.OperationJobStatusCancelled})

	// Live worker path: Begin + StartJobWithGuard, then Cancel.
	// was_active must be true.
	guard2, _, err := m.Begin(BeginOperationJobInput{OperationID: 312, Kind: "pull"})
	if err != nil {
		t.Fatalf("Begin: %v", err)
	}
	started := make(chan struct{})
	release := make(chan struct{})
	fn := func(ctx context.Context, _ func(sdkprogress.ProgressEvent), _ string) error {
		close(started)
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-release:
			return nil
		}
	}
	m.StartJobWithGuard(guard2, fn)
	<-started

	active2, tracked2 := m.CancelWithOutcome(guard2.JobID())
	if !tracked2 {
		t.Fatalf("tracked = false for live worker")
	}
	if !active2 {
		t.Fatalf("active = false for live worker, want true")
	}

	// Let the worker observe the cancel and wind down.
	close(release)

	// Unknown job ID → neither active nor tracked.
	active3, tracked3 := m.CancelWithOutcome("opjob_nonexistent")
	if tracked3 {
		t.Fatalf("tracked = true for unknown job id")
	}
	if active3 {
		t.Fatalf("active = true for unknown job id")
	}
}

// TestJanitorReclaimsStuckRow verifies the layer-B reclaim: a row in
// status=running with old updated_at whose advisory lock is free is
// marked failed by the janitor so /operation/status stops reporting
// running forever.
func TestJanitorReclaimsStuckRow(t *testing.T) {
	m, store := newTestManager(t)
	// Drive reclaim via an absurdly small threshold so the test row
	// qualifies immediately.
	m.cfg.StuckThreshold = time.Nanosecond

	// Simulate a crashed worker: a row persisted at status=running
	// with old updated_at. The advisory lock is not held (the crash
	// released it via PG session close), so the janitor probe will
	// acquire.
	_, err := store.CreateOperationJob(&db.OperationJob{
		JobID:       "opjob_stuck",
		OperationID: 777,
		Kind:        "pull",
		Status:      string(sdkmodels.OperationJobStatusRunning),
		Progress:    []byte("[]"),
	})
	if err != nil {
		t.Fatalf("CreateOperationJob: %v", err)
	}
	// Force old timestamps so the row qualifies regardless of
	// clock precision.
	store.mu.Lock()
	store.jobs["opjob_stuck"].UpdatedAt = time.Now().Add(-time.Hour)
	store.mu.Unlock()

	m.RunJanitor()

	store.mu.Lock()
	reclaimed := store.jobs["opjob_stuck"]
	store.mu.Unlock()
	if reclaimed == nil {
		t.Fatalf("stuck row disappeared from store; expected reclaim, not deletion")
	}
	if reclaimed.Status != string(sdkmodels.OperationJobStatusFailed) {
		t.Fatalf("reclaimed.Status = %q, want failed", reclaimed.Status)
	}
	if reclaimed.Error == "" {
		t.Fatalf("reclaimed.Error must describe the reclaim reason")
	}
}

// TestReleaseClosesPlaceholderWorkerDone verifies that a sync
// handler's Guard.Release wakes up any WaitForJob caller on the
// placeholder worker. Without this, sync-handler guards (push,
// schema, patch) never close the worker's done channel — no
// worker goroutine runs to close it — and WaitForJob hangs
// forever.
func TestReleaseClosesPlaceholderWorkerDone(t *testing.T) {
	m, _ := newTestManager(t)

	guard, _, err := m.Begin(BeginOperationJobInput{OperationID: 4242, Kind: "push"})
	if err != nil {
		t.Fatalf("Begin: %v", err)
	}

	// Start a WaitForJob before Release fires so we can assert it
	// unblocks. This models a graceful-shutdown path that waits on
	// every in-flight job id regardless of whether the job ran
	// async or sync.
	waitErrCh := make(chan error, 1)
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		waitErrCh <- m.WaitForJob(ctx, guard.JobID())
	}()

	// Release via the sync-handler pattern: no StartJobWithGuard,
	// just transition the row to a terminal state.
	guard.Release(JobOutcome{Status: sdkmodels.OperationJobStatusComplete})

	select {
	case waitErr := <-waitErrCh:
		if waitErr != nil {
			t.Fatalf("WaitForJob returned %v, want nil after Release", waitErr)
		}
	case <-time.After(2 * time.Second):
		t.Fatalf("WaitForJob did not unblock after Release; placeholder done channel leak")
	}
}

// TestCancelOnPlaceholderPropagatesToLateLinkedWorker covers the
// race window between Begin's registerGuardWorker and
// StartJobWithGuard's linkWorkerCancel: a cancel arriving in that
// gap hits the placeholder's no-op cancel fn. Without cancelPending
// the cancel is silently dropped and the worker goroutine runs its
// fn with a non-cancelled ctx. With it, linkWorkerCancel observes
// the pending flag and fires the real cancel so fn sees ctx.Err()
// from the first line.
func TestCancelOnPlaceholderPropagatesToLateLinkedWorker(t *testing.T) {
	m, _ := newTestManager(t)

	guard, _, err := m.Begin(BeginOperationJobInput{OperationID: 6061, Kind: "pull"})
	if err != nil {
		t.Fatalf("Begin: %v", err)
	}

	// Cancel BEFORE StartJobWithGuard. active is false because the
	// worker is still a placeholder; cancelPending is set as a
	// side effect so the real cancel fn will fire the moment
	// linkWorkerCancel installs it.
	active, tracked := m.CancelWithOutcome(guard.JobID())
	if !tracked {
		t.Fatalf("tracked = false for known placeholder job")
	}
	if active {
		t.Fatalf("active = true for placeholder; want false")
	}

	// Now start the worker. fn captures ctx.Err() observed at
	// entry so the test can assert the replayed cancellation
	// landed before user code ran.
	observedErr := make(chan error, 1)
	fn := func(ctx context.Context, _ func(sdkprogress.ProgressEvent), _ string) error {
		observedErr <- ctx.Err()
		return ctx.Err()
	}
	m.StartJobWithGuard(guard, fn)

	select {
	case errAtEntry := <-observedErr:
		if errAtEntry == nil {
			t.Fatalf(
				"fn observed ctx.Err()=nil at entry; placeholder-cancel was silently dropped",
			)
		}
	case <-time.After(2 * time.Second):
		t.Fatalf("worker fn never ran or never reported ctx state")
	}

	// Wait for terminal transition and assert cancelled status.
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		row, _, snapErr := m.Snapshot(guard.JobID())
		if snapErr == nil && row.Status == string(sdkmodels.OperationJobStatusCancelled) {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("row never reached cancelled status after placeholder-cancel was replayed")
}

// TestJanitorReclaimDoesNotClobberRaceWinnerTerminal covers the
// TOCTOU window between ListStuckOperationJobs and the lock probe:
// a worker can legitimately complete in that window, release its
// lock, and write status=complete. The probe would then acquire
// the now-free lock — the reclaim path must re-read the row under
// the lock and back off when it sees a terminal status, rather
// than clobbering the completed row with failed and stranding its
// result.
//
// We simulate the race by calling reclaimOneStuckJob directly with
// a stale copy of the job record while the store already has the
// row flipped to complete. The handler must leave the row at
// complete.
func TestJanitorReclaimDoesNotClobberRaceWinnerTerminal(t *testing.T) {
	m, store := newTestManager(t)
	m.cfg.StuckThreshold = time.Nanosecond

	_, err := store.CreateOperationJob(&db.OperationJob{
		JobID:       "opjob_race_winner",
		OperationID: 900,
		Kind:        "pull",
		Status:      string(sdkmodels.OperationJobStatusRunning),
		Progress:    []byte("[]"),
	})
	if err != nil {
		t.Fatalf("CreateOperationJob: %v", err)
	}

	// Snapshot the row as the List call would have seen it (stale:
	// status=running, old updated_at).
	staleView := db.OperationJob{
		JobID:       "opjob_race_winner",
		OperationID: 900,
		Kind:        "pull",
		Status:      string(sdkmodels.OperationJobStatusRunning),
		UpdatedAt:   time.Now().Add(-time.Hour),
	}

	// Simulate the winning-worker race: the live row transitions
	// to complete before reclaimOneStuckJob runs.
	expires := time.Now().Add(1 * time.Hour)
	resultPath := "/tmp/opjob_race_winner.zip"
	empty := ""
	if updateErr := store.UpdateOperationJobStatus(
		"opjob_race_winner",
		string(sdkmodels.OperationJobStatusComplete),
		&empty,
		&resultPath,
		&expires,
	); updateErr != nil {
		t.Fatalf("simulate completion: %v", updateErr)
	}

	// Janitor attempts reclaim on the stale snapshot. The lock is
	// free (the winning worker already released it), so the probe
	// acquires — but the re-read inside the callback sees terminal
	// status and backs off.
	reclaimed := m.reclaimOneStuckJob(staleView, time.Now())
	if reclaimed {
		t.Fatalf("janitor reclaimed a row that had legitimately completed")
	}

	store.mu.Lock()
	row := store.jobs["opjob_race_winner"]
	store.mu.Unlock()
	if row.Status != string(sdkmodels.OperationJobStatusComplete) {
		t.Fatalf("row.Status = %q, want complete (janitor must not clobber)", row.Status)
	}
	if row.ResultPath != resultPath {
		t.Fatalf("row.ResultPath = %q, want %q (result must remain fetchable)", row.ResultPath, resultPath)
	}
	if row.Error != "" {
		t.Fatalf("row.Error = %q, want empty (no reclaim message)", row.Error)
	}
}
