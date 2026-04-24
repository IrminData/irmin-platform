// Unit tests for the async-pull poll wrapper. Exercised against an
// httptest.Server that speaks the 202/status/result/cancel protocol
// directly — going through the real SDK client so we cover both the
// wire contract and the in-repo wrapper semantics.
//
//nolint:testpackage // internal test for the poll loop so we can read package-level state and helpers directly.
package connectorsclient

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	sdkconnectors "github.com/IrminData/irmin-sdk-go/connectorsclient"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/IrminData/irmin-sdk-go/observability"
)

// jobServerConfig controls the fake connector service's behaviour.
// Each test configures the paths it cares about and lets the rest
// default to sensible success semantics.
type jobServerConfig struct {
	// startStatus is the HTTP status returned by POST /operation/pull.
	// Default 202.
	startStatus int
	// startStatusForCall, when set, overrides startStatus with per-request
	// behavior. call is 1-indexed.
	startStatusForCall func(call int64) int
	// startBody is the response body for POST /operation/pull. Default
	// `{"job_id":"..."}`.
	startBody string
	// startBodyForCall, when set, overrides startBody with per-request
	// behavior. call is 1-indexed.
	startBodyForCall func(call int64) string
	// onStart is invoked on each /operation/pull request.
	onStart func()
	// statusSequence lists the status responses returned by GET
	// /operation/status/:id, one per call, clamping to the last entry.
	statusSequence []irminmodels.OperationJobStatusResponse
	// resultBody is the response body for GET /operation/result/:id.
	resultBody string
	// resultStatus is the HTTP status for GET /operation/result/:id.
	// Default 200.
	resultStatus int
	// cancelDelay blocks /operation/cancel responses to emulate a slow
	// or hung connector cancel endpoint.
	cancelDelay time.Duration
	// cancelHandler, when set, overrides the default /operation/cancel
	// handler and can inspect incoming cancel requests.
	cancelHandler http.HandlerFunc
}

// jobServer captures the fake server plus per-test observability:
// cancel receipts, status-call count, etc.
type jobServer struct {
	srv          *httptest.Server
	cancelCalled atomic.Bool
	statusCalls  atomic.Int64
	startCalls   atomic.Int64

	mu        sync.Mutex
	statusIdx int
}

func newJobServer(t *testing.T, cfg jobServerConfig) *jobServer {
	t.Helper()

	defaultStartStatus := cfg.startStatus
	if defaultStartStatus == 0 {
		defaultStartStatus = http.StatusAccepted
	}
	defaultStartBody := cfg.startBody
	if defaultStartBody == "" {
		defaultStartBody = `{"job_id":"opjob_test_abc"}`
	}
	if cfg.resultStatus == 0 {
		cfg.resultStatus = http.StatusOK
	}

	js := &jobServer{}

	mux := http.NewServeMux()
	mux.HandleFunc("/operation/pull", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		startStatus, startBody := resolveStartResponse(js, cfg, defaultStartStatus, defaultStartBody)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(startStatus)
		_, _ = io.WriteString(w, startBody)
	})
	mux.HandleFunc("/operation/status/", func(w http.ResponseWriter, r *http.Request) {
		jobID := strings.TrimPrefix(r.URL.Path, "/operation/status/")
		js.mu.Lock()
		idx := js.statusIdx
		if idx >= len(cfg.statusSequence) {
			idx = len(cfg.statusSequence) - 1
		}
		if idx < 0 {
			idx = 0
		}
		js.statusIdx++
		js.mu.Unlock()

		js.statusCalls.Add(1)
		w.Header().Set("Content-Type", "application/json")

		if len(cfg.statusSequence) == 0 {
			// No sequence configured: respond with a single complete.
			resp := irminmodels.OperationJobStatusResponse{
				JobID:  jobID,
				Status: irminmodels.OperationJobStatusComplete,
			}
			_ = json.NewEncoder(w).Encode(resp)
			return
		}
		resp := cfg.statusSequence[idx]
		if resp.JobID == "" {
			resp.JobID = jobID
		}
		_ = json.NewEncoder(w).Encode(resp)
	})
	mux.HandleFunc("/operation/result/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/zip")
		w.WriteHeader(cfg.resultStatus)
		_, _ = io.WriteString(w, cfg.resultBody)
	})
	mux.HandleFunc("/operation/cancel/", func(w http.ResponseWriter, r *http.Request) {
		if cfg.cancelHandler != nil {
			cfg.cancelHandler(w, r)
			return
		}
		js.cancelCalled.Store(true)
		if cfg.cancelDelay > 0 {
			time.Sleep(cfg.cancelDelay)
		}
		w.WriteHeader(http.StatusOK)
	})

	js.srv = httptest.NewServer(mux)
	t.Cleanup(js.srv.Close)
	return js
}

func resolveStartResponse(
	js *jobServer,
	cfg jobServerConfig,
	defaultStartStatus int,
	defaultStartBody string,
) (int, string) {
	call := js.startCalls.Add(1)
	if cfg.onStart != nil {
		cfg.onStart()
	}

	startStatus := defaultStartStatus
	if cfg.startStatusForCall != nil {
		startStatus = cfg.startStatusForCall(call)
	}
	startBody := defaultStartBody
	if cfg.startBodyForCall != nil {
		startBody = cfg.startBodyForCall(call)
	}
	return startStatus, startBody
}

// --- happy path --------------------------------------------------

func TestOperationPull_HappyPath(t *testing.T) {
	js := newJobServer(t, jobServerConfig{
		statusSequence: []irminmodels.OperationJobStatusResponse{
			{Status: irminmodels.OperationJobStatusComplete},
		},
		resultBody: "zip-bytes-here",
	})
	c := NewClient(js.srv.URL, "tok", "en")

	got, err := c.OperationPull(context.Background(), "/v1/customers")
	if err != nil {
		t.Fatalf("OperationPull: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("got %d files, want 1", len(got))
	}
	if string(got[0].Content) != "zip-bytes-here" {
		t.Fatalf("unexpected content %q", got[0].Content)
	}
	if js.cancelCalled.Load() {
		t.Fatalf("cancel should not fire on happy path")
	}
}

func TestOperationPull_StartConflictRetriesUntilCleanupCompletes(t *testing.T) {
	js := newJobServer(t, jobServerConfig{
		startStatusForCall: conflictThenSuccessStartStatus,
		startBodyForCall:   conflictThenSuccessStartBody,
		statusSequence: []irminmodels.OperationJobStatusResponse{
			{Status: irminmodels.OperationJobStatusComplete},
		},
		resultBody: "zip-bytes-here",
	})
	c := NewClient(js.srv.URL, "tok", "en")

	got, err := c.OperationPull(context.Background(), "/v1/customers")
	if err != nil {
		t.Fatalf("OperationPull should recover from start conflict retries, got %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("got %d files, want 1", len(got))
	}
	if string(got[0].Content) != "zip-bytes-here" {
		t.Fatalf("unexpected content %q", got[0].Content)
	}
	if gotCalls := js.startCalls.Load(); gotCalls < 3 {
		t.Fatalf("expected at least 3 start calls (2 conflicts then success), got %d", gotCalls)
	}
	if !js.cancelCalled.Load() {
		t.Fatalf("cancel endpoint should be called when conflict exposes running job id")
	}
}

// TestOperationPull_StartConflictSurfacesParentContextCancellation
// verifies that a parent-ctx cancellation during the retry backoff
// propagates as a context error (errors.Is against context.Canceled
// / DeadlineExceeded returns true) instead of being misclassified
// as the last AlreadyRunningError. Callers separating "user asked
// us to stop" from "server kept saying 409 until the budget
// expired" rely on this.
func TestOperationPull_StartConflictSurfacesParentContextCancellation(t *testing.T) {
	// Server returns 409 indefinitely so the retry loop keeps
	// spinning until the parent ctx fires.
	js := newJobServer(t, jobServerConfig{
		startStatus: http.StatusConflict,
		startBody: func() string {
			body, _ := json.Marshal(irminmodels.AlreadyRunningBody{
				Error: "Operation is already running",
				JobID: "opjob_perma_conflict",
			})
			return string(body)
		}(),
	})
	c := NewClient(js.srv.URL, "tok", "en")

	// Cancel the parent while the retry loop is in its backoff
	// select. 100ms is longer than one startConflictRetryInterval
	// (1s) so we need the ctx deadline shorter than the retry
	// budget (15s) but long enough to hit at least one 409.
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	_, err := c.OperationPull(ctx, "/v1/customers")
	if err == nil {
		t.Fatalf("expected error on parent-ctx cancel during retry")
	}
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf(
			"expected errors.Is(err, context.DeadlineExceeded)=true on parent-ctx expiry, got err=%v",
			err,
		)
	}
	// And NOT misclassified as the retried AlreadyRunningError —
	// the parent-ctx case should not carry that sentinel.
	if errors.Is(err, sdkconnectors.ErrOperationAlreadyRunning) {
		t.Fatalf("parent-ctx cancel should not surface as ErrOperationAlreadyRunning: %v", err)
	}
}

func TestOperationPull_StartConflictWithoutJobIDUsesCachedJobForCleanup(t *testing.T) {
	const cachedJobID = "opjob_cached_running"

	var cancelPath atomic.Value
	js := newJobServer(t, jobServerConfig{
		startStatusForCall: func(call int64) int {
			if call == 1 {
				return http.StatusConflict
			}
			return http.StatusAccepted
		},
		startBodyForCall: func(call int64) string {
			if call == 1 {
				return `{"error":"Operation is already running"}`
			}
			return `{"job_id":"opjob_after_cached_cleanup"}`
		},
		cancelHandler: func(w http.ResponseWriter, r *http.Request) {
			cancelPath.Store(r.URL.Path)
			w.WriteHeader(http.StatusOK)
		},
		statusSequence: []irminmodels.OperationJobStatusResponse{
			{Status: irminmodels.OperationJobStatusComplete},
		},
		resultBody: "zip-bytes-here",
	})
	c := NewClient(js.srv.URL, "tok", "en")
	c.WithFallbackAsyncPullJobID(cachedJobID)

	got, err := c.OperationPull(context.Background(), "/v1/customers")
	if err != nil {
		t.Fatalf("OperationPull should recover from conflict without job_id using cached job, got %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("got %d files, want 1", len(got))
	}
	if gotPath, ok := cancelPath.Load().(string); !ok || gotPath != "/operation/cancel/"+cachedJobID {
		t.Fatalf("expected cached job cancel path %q, got %q", "/operation/cancel/"+cachedJobID, gotPath)
	}
}

func TestOperationPull_EmptyJobIDFailsFastWithActionableError(t *testing.T) {
	js := newJobServer(t, jobServerConfig{
		startBody: `{"job_id":""}`,
	})
	c := NewClient(js.srv.URL, "tok", "en")

	_, err := c.OperationPull(context.Background(), "/v1/customers")
	if err == nil {
		t.Fatalf("expected error for empty job_id from async pull start")
	}
	if !strings.Contains(err.Error(), "did not return a job_id") {
		t.Fatalf("unexpected error for empty job_id: %v", err)
	}
}

func TestAsSDKClient_StreamingFetchIgnoresShortHTTPClientTimeout(t *testing.T) {
	const resultDelay = 80 * time.Millisecond

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/operation/result/") {
			http.Error(w, "unexpected path", http.StatusNotFound)
			return
		}
		time.Sleep(resultDelay)
		w.Header().Set("Content-Type", "application/zip")
		w.WriteHeader(http.StatusOK)
		_, _ = io.WriteString(w, "zip-bytes-here")
	}))
	t.Cleanup(srv.Close)

	c := NewClient(srv.URL, "tok", "en")
	sdk := c.asSDKClient()
	sdk.HTTPClient.Timeout = 10 * time.Millisecond

	start := time.Now()
	reader, err := sdk.FetchOperationResult(context.Background(), "opjob_test")
	if err != nil {
		t.Fatalf("FetchOperationResult should ignore HTTPClient timeout for stream reads, got %v", err)
	}
	defer func() { _ = reader.Close() }()

	body, readErr := io.ReadAll(reader)
	if readErr != nil {
		t.Fatalf("failed to read streamed result: %v", readErr)
	}
	if string(body) != "zip-bytes-here" {
		t.Fatalf("unexpected streamed body %q", string(body))
	}
	if elapsed := time.Since(start); elapsed < resultDelay {
		t.Fatalf("expected delayed stream response path to run, elapsed=%s", elapsed)
	}
}

func conflictThenSuccessStartStatus(call int64) int {
	if call <= 2 {
		return http.StatusConflict
	}
	return http.StatusAccepted
}

func conflictThenSuccessStartBody(call int64) string {
	if call <= 2 {
		return `{"error":"Operation is already running","job_id":"opjob_conflict_running"}`
	}
	return `{"job_id":"opjob_after_cleanup"}`
}

// TestOperationPull_StartConflictExtractsJobIDFromStructuredBody
// verifies the headline payoff of the SDK typed-error migration:
// a 409 carrying the full AlreadyRunningBody surfaces the blocking
// job_id directly via errors.As, and the subsequent best-effort
// cancel targets that exact job_id — no cache fallback needed.
func TestOperationPull_StartConflictExtractsJobIDFromStructuredBody(t *testing.T) {
	const blockingJobID = "opjob_structured_blocker"

	var cancelPath atomic.Value
	js := newJobServer(t, jobServerConfig{
		startStatusForCall: func(call int64) int {
			if call == 1 {
				return http.StatusConflict
			}
			return http.StatusAccepted
		},
		startBodyForCall: func(call int64) string {
			if call == 1 {
				body, _ := json.Marshal(irminmodels.AlreadyRunningBody{
					Error:       "Operation is already running",
					JobID:       blockingJobID,
					OperationID: 42,
					Kind:        "pull",
				})
				return string(body)
			}
			return `{"job_id":"opjob_after_cleanup"}`
		},
		cancelHandler: func(w http.ResponseWriter, r *http.Request) {
			cancelPath.Store(r.URL.Path)
			w.WriteHeader(http.StatusOK)
		},
		statusSequence: []irminmodels.OperationJobStatusResponse{
			{Status: irminmodels.OperationJobStatusComplete},
		},
		resultBody: "zip-bytes",
	})
	c := NewClient(js.srv.URL, "tok", "en")
	// Seed the fallback cache with a DIFFERENT job id so we can
	// assert the structured path wins — if this ever falls back to
	// the cache, the cancel path would hit "opjob_should_not_use".
	c.WithFallbackAsyncPullJobID("opjob_should_not_use")

	got, err := c.OperationPull(context.Background(), "/v1/customers")
	if err != nil {
		t.Fatalf("OperationPull: %v", err)
	}
	if len(got) != 1 || string(got[0].Content) != "zip-bytes" {
		t.Fatalf("unexpected result: %+v", got)
	}
	if gotPath, ok := cancelPath.Load().(string); !ok || gotPath != "/operation/cancel/"+blockingJobID {
		t.Fatalf("expected cancel on structured-body job id %q, got %q", blockingJobID, gotPath)
	}
}

// TestPollOperationJob_FailFastOnNonRetryableServerError verifies
// the poll-loop fail-fast: a single 500 carrying
// JobErrorBody{Retryable: false} aborts the loop immediately
// rather than burning through the three-strike consecutive-error
// budget.
func TestPollOperationJob_FailFastOnNonRetryableServerError(t *testing.T) {
	body, _ := json.Marshal(irminmodels.JobErrorBody{
		Error:     "progress JSON corrupted",
		Reason:    irminmodels.JobErrorReasonCorruptedRow,
		Retryable: false,
		JobID:     "opjob_corrupt",
	})
	var statusCalls atomic.Int64
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.Method == http.MethodPost && r.URL.Path == "/operation/pull":
			w.WriteHeader(http.StatusAccepted)
			_ = json.NewEncoder(w).Encode(irminmodels.StartOperationPullResponse{JobID: "opjob_corrupt"})
		case r.Method == http.MethodGet && strings.HasPrefix(r.URL.Path, "/operation/status/"):
			statusCalls.Add(1)
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusInternalServerError)
			_, _ = w.Write(body)
		case r.Method == http.MethodPost && strings.HasPrefix(r.URL.Path, "/operation/cancel/"):
			w.WriteHeader(http.StatusOK)
		default:
			t.Errorf("unexpected request: %s %s", r.Method, r.URL.Path)
			http.NotFound(w, r)
		}
	}))
	t.Cleanup(srv.Close)

	c := NewClient(srv.URL, "tok", "en")
	_, err := c.OperationPull(context.Background(), "/v1/customers")
	if err == nil {
		t.Fatalf("expected error for non-retryable server-side poll failure")
	}
	if !strings.Contains(err.Error(), "non-retryable server error") {
		t.Fatalf("expected non-retryable server error wrapper, got %v", err)
	}
	if !strings.Contains(err.Error(), string(irminmodels.JobErrorReasonCorruptedRow)) {
		t.Fatalf("expected err to include reason, got %v", err)
	}
	if got := statusCalls.Load(); got != 1 {
		t.Fatalf(
			"expected exactly one status call before fail-fast, got %d",
			got,
		)
	}
}

// --- failed terminal status --------------------------------------

func TestOperationPull_FailedTerminalStatus(t *testing.T) {
	js := newJobServer(t, jobServerConfig{
		statusSequence: []irminmodels.OperationJobStatusResponse{
			{
				Status: irminmodels.OperationJobStatusFailed,
				Error:  "upstream 401 Unauthorized",
			},
		},
	})
	c := NewClient(js.srv.URL, "tok", "en")

	_, err := c.OperationPull(context.Background(), "/x")
	if err == nil {
		t.Fatalf("expected error on failed terminal status")
	}
	if !errors.Is(err, sdkconnectors.ErrJobFailed) {
		t.Fatalf("err %v should match ErrJobFailed", err)
	}
	var jobErr *sdkconnectors.JobFailedError
	if !errors.As(err, &jobErr) {
		t.Fatalf("err %v should As *JobFailedError", err)
	}
	if jobErr.Status != irminmodels.OperationJobStatusFailed {
		t.Fatalf("unexpected status %q", jobErr.Status)
	}
	if jobErr.Message != "upstream 401 Unauthorized" {
		t.Fatalf("unexpected message %q", jobErr.Message)
	}
}

func TestOperationPull_CancelledTerminalStatus(t *testing.T) {
	js := newJobServer(t, jobServerConfig{
		statusSequence: []irminmodels.OperationJobStatusResponse{
			{Status: irminmodels.OperationJobStatusCancelled},
		},
	})
	c := NewClient(js.srv.URL, "tok", "en")

	_, err := c.OperationPull(context.Background(), "/x")
	if !errors.Is(err, sdkconnectors.ErrJobFailed) {
		t.Fatalf("cancelled status should wrap ErrJobFailed, got %v", err)
	}
	var jobErr *sdkconnectors.JobFailedError
	if !errors.As(err, &jobErr) {
		t.Fatalf("cancelled terminal status should expose *JobFailedError")
	}
	if jobErr.Status != irminmodels.OperationJobStatusCancelled {
		t.Fatalf("unexpected status %q", jobErr.Status)
	}
}

// --- cancel on ctx done ------------------------------------------

func TestOperationPull_CancelOnContextDone(t *testing.T) {
	// Server keeps returning running forever.
	js := newJobServer(t, jobServerConfig{
		statusSequence: []irminmodels.OperationJobStatusResponse{
			{Status: irminmodels.OperationJobStatusRunning},
		},
	})
	c := NewClient(js.srv.URL, "tok", "en")

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	var gotErr error
	go func() {
		_, gotErr = c.OperationPull(ctx, "/x")
		close(done)
	}()

	// Wait for at least one status poll to confirm the loop is
	// running, then cancel. The first poll is immediate (before the
	// ticker), so this should complete quickly.
	deadline := time.Now().Add(2 * time.Second)
	for js.statusCalls.Load() == 0 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if js.statusCalls.Load() == 0 {
		t.Fatalf("poll loop did not make an initial status call")
	}
	cancel()

	select {
	case <-done:
	case <-time.After(10 * time.Second):
		t.Fatalf("OperationPull did not return after ctx cancel")
	}

	if !errors.Is(gotErr, context.Canceled) {
		t.Fatalf("expected context.Canceled, got %v", gotErr)
	}

	// Best-effort cancel should have fired.
	deadline = time.Now().Add(2 * time.Second)
	for !js.cancelCalled.Load() && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if !js.cancelCalled.Load() {
		t.Fatalf("best-effort /operation/cancel should have been called")
	}
}

// --- timeout between polls ---------------------------------------

// TestOperationPull_TimeoutBetweenPolls exercises the MaxRuntime
// analogue: a context.WithDeadline that expires while we're waiting
// for the next tick. The server never transitions past running.
func TestOperationPull_TimeoutBetweenPolls(t *testing.T) {
	js := newJobServer(t, jobServerConfig{
		statusSequence: []irminmodels.OperationJobStatusResponse{
			{Status: irminmodels.OperationJobStatusRunning},
		},
	})
	c := NewClient(js.srv.URL, "tok", "en")

	// Deadline shorter than one PollInterval so we must be woken up
	// by ctx.Done while the ticker case is still pending.
	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()

	_, err := c.OperationPull(ctx, "/x")
	if !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("expected DeadlineExceeded, got %v", err)
	}
	// Cancel best-effort should have fired.
	deadline := time.Now().Add(2 * time.Second)
	for !js.cancelCalled.Load() && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if !js.cancelCalled.Load() {
		t.Fatalf("best-effort cancel should have fired on deadline")
	}
}

// TestOperationPull_CancelDoesNotBlockOnSlowBestEffortCancel verifies
// that pollOperationJob does not synchronously wait on /operation/cancel.
func TestOperationPull_CancelDoesNotBlockOnSlowBestEffortCancel(t *testing.T) {
	js := newJobServer(t, jobServerConfig{
		statusSequence: []irminmodels.OperationJobStatusResponse{
			{Status: irminmodels.OperationJobStatusRunning},
		},
		// Longer than cancelBestEffortTimeout to emulate a hung cancel.
		cancelDelay: cancelBestEffortTimeout + 500*time.Millisecond,
	})
	c := NewClient(js.srv.URL, "tok", "en")

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() {
		_, err := c.OperationPull(ctx, "/x")
		done <- err
	}()

	deadline := time.Now().Add(2 * time.Second)
	for js.statusCalls.Load() == 0 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if js.statusCalls.Load() == 0 {
		t.Fatalf("poll loop did not make an initial status call")
	}

	start := time.Now()
	cancel()

	select {
	case err := <-done:
		if !errors.Is(err, context.Canceled) {
			t.Fatalf("expected context.Canceled, got %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatalf("OperationPull blocked waiting for best-effort cancel")
	}

	if elapsed := time.Since(start); elapsed > time.Second {
		t.Fatalf("OperationPull return took %s after ctx cancel; expected immediate return", elapsed)
	}

	// The cancel request should still be attempted in the background.
	deadline = time.Now().Add(500 * time.Millisecond)
	for !js.cancelCalled.Load() && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if !js.cancelCalled.Load() {
		t.Fatalf("best-effort cancel should be attempted even when slow")
	}
}

// --- poll timeout retry semantics --------------------------------

func TestPollOperationJob_PollTimeoutRetriesWithoutCancellingJob(t *testing.T) {
	c := NewClient("http://example.invalid", "tok", "en")

	var fetchCalls atomic.Int64
	fetchStatus := func(
		_ context.Context,
		_ *sdkconnectors.Client,
		_ string,
	) (*irminmodels.OperationJobStatusResponse, error) {
		call := fetchCalls.Add(1)
		switch call {
		case 1:
			// Simulate the child pollCtx timing out while parent ctx is active.
			return nil, context.DeadlineExceeded
		case 2:
			return &irminmodels.OperationJobStatusResponse{
				Status: irminmodels.OperationJobStatusRunning,
			}, nil
		case 3:
			return &irminmodels.OperationJobStatusResponse{
				Status: irminmodels.OperationJobStatusComplete,
			}, nil
		default:
			t.Fatalf("unexpected extra fetch call #%d", call)
			return nil, errors.New("unexpected extra fetch call")
		}
	}

	if err := c.pollOperationJobWithFetcher(context.Background(), nil, "job_test", fetchStatus); err != nil {
		t.Fatalf("pollOperationJob should recover from poll timeout and continue, got %v", err)
	}
	if got := fetchCalls.Load(); got != 3 {
		t.Fatalf("expected exactly 3 fetch calls (timeout + running + complete), got %d", got)
	}
}

func TestPollOperationJob_SlowInitialFetchStillWaitsFullPollIntervalBeforeNextPoll(t *testing.T) {
	c := NewClient("http://example.invalid", "tok", "en")

	var fetchCalls atomic.Int64
	firstCallDone := make(chan struct{})
	secondCallAt := make(chan time.Time, 1)

	fetchStatus := func(
		_ context.Context,
		_ *sdkconnectors.Client,
		_ string,
	) (*irminmodels.OperationJobStatusResponse, error) {
		call := fetchCalls.Add(1)
		switch call {
		case 1:
			time.Sleep(PollInterval / 2)
			close(firstCallDone)
			return &irminmodels.OperationJobStatusResponse{
				Status: irminmodels.OperationJobStatusRunning,
			}, nil
		case 2:
			select {
			case secondCallAt <- time.Now():
			default:
			}
			return &irminmodels.OperationJobStatusResponse{
				Status: irminmodels.OperationJobStatusComplete,
			}, nil
		default:
			t.Fatalf("unexpected extra fetch call #%d", call)
			return nil, errors.New("unexpected extra fetch call")
		}
	}

	start := time.Now()
	pollErr := c.pollOperationJobWithFetcher(context.Background(), nil, "job_test", fetchStatus)
	if pollErr != nil {
		t.Fatalf("pollOperationJob should complete successfully, got %v", pollErr)
	}

	select {
	case <-firstCallDone:
	case <-time.After(2 * PollInterval):
		t.Fatalf("timed out waiting for first fetch completion marker")
	}

	var secondAt time.Time
	select {
	case secondAt = <-secondCallAt:
	case <-time.After(2 * PollInterval):
		t.Fatalf("timed out waiting for second fetch timestamp")
	}

	minWaitAfterFirst := PollInterval - (PollInterval / 4)
	firstDoneAt := start.Add(PollInterval / 2)
	if elapsedAfterFirst := secondAt.Sub(firstDoneAt); elapsedAfterFirst < minWaitAfterFirst {
		t.Fatalf(
			"expected second poll >= %s after first finished, got %s",
			minWaitAfterFirst,
			elapsedAfterFirst,
		)
	}
	if got := fetchCalls.Load(); got != 2 {
		t.Fatalf("expected exactly 2 fetch calls, got %d", got)
	}
}

func TestPollOperationJob_NilStatusResponseRetriesAndFailsFast(t *testing.T) {
	js := newJobServer(t, jobServerConfig{})
	c := NewClient(js.srv.URL, "tok", "en")

	var fetchCalls atomic.Int64
	// Keep this data-driven to exercise the external-contract edge case
	// (nil status + nil error) without triggering lint's nilnil rule.
	statusByCall := map[int64]*irminmodels.OperationJobStatusResponse{}
	pollErr := c.pollOperationJobWithFetcher(
		context.Background(),
		c.asSDKClient(),
		"job_test",
		func(
			_ context.Context,
			_ *sdkconnectors.Client,
			_ string,
		) (*irminmodels.OperationJobStatusResponse, error) {
			call := fetchCalls.Add(1)
			return statusByCall[call], nil
		},
	)
	if pollErr == nil {
		t.Fatalf("expected poll error after repeated nil status responses")
	}
	if !strings.Contains(pollErr.Error(), "async pull status poll returned nil response") {
		t.Fatalf("unexpected poll error: %v", pollErr)
	}
	if got := fetchCalls.Load(); got != maxConsecutiveStatusPollErrors {
		t.Fatalf("expected %d fetch calls before abort, got %d", maxConsecutiveStatusPollErrors, got)
	}

	deadline := time.Now().Add(2 * time.Second)
	for !js.cancelCalled.Load() && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if !js.cancelCalled.Load() {
		t.Fatalf("best-effort cancel should fire on repeated nil status responses")
	}
}

func TestPollOperationJob_ConsecutivePollTimeoutsBestEffortCancelsJob(t *testing.T) {
	js := newJobServer(t, jobServerConfig{})
	c := NewClient(js.srv.URL, "tok", "en")

	var fetchCalls atomic.Int64
	pollErr := c.pollOperationJobWithFetcher(
		context.Background(),
		c.asSDKClient(),
		"job_test",
		func(
			_ context.Context,
			_ *sdkconnectors.Client,
			_ string,
		) (*irminmodels.OperationJobStatusResponse, error) {
			fetchCalls.Add(1)
			return nil, context.DeadlineExceeded
		},
	)
	if pollErr == nil {
		t.Fatalf("expected poll error after repeated poll timeouts")
	}
	if !strings.Contains(pollErr.Error(), "failed to poll job job_test after") {
		t.Fatalf("unexpected poll error: %v", pollErr)
	}
	if !errors.Is(pollErr, context.DeadlineExceeded) {
		t.Fatalf("expected timeout root cause, got %v", pollErr)
	}
	if got := fetchCalls.Load(); got != maxConsecutiveStatusPollErrors {
		t.Fatalf("expected %d fetch calls before abort, got %d", maxConsecutiveStatusPollErrors, got)
	}

	deadline := time.Now().Add(2 * time.Second)
	for !js.cancelCalled.Load() && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if !js.cancelCalled.Load() {
		t.Fatalf("best-effort cancel should fire on repeated poll timeouts")
	}
}

func TestPollOperationJob_NonContextPollErrorRetriesWithoutCancellingJob(t *testing.T) {
	js := newJobServer(t, jobServerConfig{})
	c := NewClient(js.srv.URL, "tok", "en")

	var fetchCalls atomic.Int64
	pollErr := c.pollOperationJobWithFetcher(
		context.Background(),
		c.asSDKClient(),
		"job_test",
		func(
			_ context.Context,
			_ *sdkconnectors.Client,
			_ string,
		) (*irminmodels.OperationJobStatusResponse, error) {
			call := fetchCalls.Add(1)
			switch call {
			case 1:
				return nil, errors.New("status endpoint returned 500")
			case 2:
				return &irminmodels.OperationJobStatusResponse{
					Status: irminmodels.OperationJobStatusRunning,
				}, nil
			case 3:
				return &irminmodels.OperationJobStatusResponse{
					Status: irminmodels.OperationJobStatusComplete,
				}, nil
			default:
				t.Fatalf("unexpected extra fetch call #%d", call)
				return nil, errors.New("unexpected extra fetch call")
			}
		},
	)
	if pollErr != nil {
		t.Fatalf("expected poll loop to recover from one non-context poll error, got %v", pollErr)
	}
	if got := fetchCalls.Load(); got != 3 {
		t.Fatalf("expected 3 fetch calls (transient error + running + complete), got %d", got)
	}
	if js.cancelCalled.Load() {
		t.Fatalf("best-effort cancel should not fire when a transient poll error is recovered")
	}
}

func TestPollOperationJob_ConsecutiveNonContextPollErrorsBestEffortCancelsJob(t *testing.T) {
	js := newJobServer(t, jobServerConfig{})
	c := NewClient(js.srv.URL, "tok", "en")

	var fetchCalls atomic.Int64
	pollErr := c.pollOperationJobWithFetcher(
		context.Background(),
		c.asSDKClient(),
		"job_test",
		func(
			_ context.Context,
			_ *sdkconnectors.Client,
			_ string,
		) (*irminmodels.OperationJobStatusResponse, error) {
			fetchCalls.Add(1)
			return nil, errors.New("status endpoint returned 500")
		},
	)
	if pollErr == nil {
		t.Fatalf("expected poll error")
	}
	if !strings.Contains(pollErr.Error(), "failed to poll job job_test after") {
		t.Fatalf("unexpected poll error: %v", pollErr)
	}
	if got := fetchCalls.Load(); got != maxConsecutiveStatusPollErrors {
		t.Fatalf("expected %d fetch calls before abort, got %d", maxConsecutiveStatusPollErrors, got)
	}

	// Non-context polling errors should still trigger best-effort cancel so
	// the connector side does not keep running an orphaned job.
	deadline := time.Now().Add(2 * time.Second)
	for !js.cancelCalled.Load() && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if !js.cancelCalled.Load() {
		t.Fatalf("best-effort cancel should fire on non-context poll error")
	}
}

func TestPollOperationJob_ConsecutiveNonContextPollErrorsWaitsForCancelBeforeReturn(t *testing.T) {
	js := newJobServer(t, jobServerConfig{
		cancelDelay: 250 * time.Millisecond,
	})
	c := NewClient(js.srv.URL, "tok", "en")

	start := time.Now()
	pollErr := c.pollOperationJobWithFetcher(
		context.Background(),
		c.asSDKClient(),
		"job_test",
		func(
			_ context.Context,
			_ *sdkconnectors.Client,
			_ string,
		) (*irminmodels.OperationJobStatusResponse, error) {
			return nil, errors.New("status endpoint returned 500")
		},
	)
	if pollErr == nil {
		t.Fatalf("expected poll error")
	}
	if !strings.Contains(pollErr.Error(), "failed to poll job job_test after") {
		t.Fatalf("unexpected poll error: %v", pollErr)
	}
	if elapsed := time.Since(start); elapsed < 200*time.Millisecond {
		t.Fatalf("poll loop returned before synchronous cancel could complete: %s", elapsed)
	}
	if !js.cancelCalled.Load() {
		t.Fatalf("cancel endpoint should be called before poll loop returns")
	}
}

// --- result fetch error ------------------------------------------

func TestOperationPull_ResultFetchError(t *testing.T) {
	js := newJobServer(t, jobServerConfig{
		statusSequence: []irminmodels.OperationJobStatusResponse{
			{Status: irminmodels.OperationJobStatusComplete},
		},
		resultStatus: http.StatusGone, // 410 expired
		resultBody:   `{"error":"expired"}`,
	})
	c := NewClient(js.srv.URL, "tok", "en")

	_, err := c.OperationPull(context.Background(), "/x")
	if err == nil {
		t.Fatalf("expected error on result 410")
	}
	if !strings.Contains(err.Error(), "fetch async pull result") {
		t.Fatalf("error %q should mention fetch failure", err.Error())
	}
	var apiErr *sdkconnectors.APIError
	if !errors.As(err, &apiErr) {
		t.Fatalf("err %v should wrap *APIError", err)
	}
	if apiErr.StatusCode != http.StatusGone {
		t.Fatalf("unexpected status %d", apiErr.StatusCode)
	}
}

// TestOperationPull_ResultFetchErrorClearsFallbackCache verifies that a
// failed FetchOperationResult clears the remembered job id so the next
// pull on the same Client doesn't use the terminal job's id as the
// blocker-of-409 target. Without this, a completed job whose result
// fetch flaked would trigger a spurious cancel on the next pull
// attempt's 409. Connection id > 0 is required for the cache to be
// written/read in the first place.
func TestOperationPull_ResultFetchErrorClearsFallbackCache(t *testing.T) {
	js := newJobServer(t, jobServerConfig{
		statusSequence: []irminmodels.OperationJobStatusResponse{
			{Status: irminmodels.OperationJobStatusComplete},
		},
		resultStatus: http.StatusGone,
		resultBody:   `{"error":"expired"}`,
	})
	c := NewClient(js.srv.URL, "tok", "en").WithConnectionID(42)

	if _, err := c.OperationPull(context.Background(), "/x"); err == nil {
		t.Fatalf("expected error on result 410")
	}
	if got := c.LastAsyncPullJobID(); got != "" {
		t.Fatalf(
			"LastAsyncPullJobID = %q after failed fetch; want empty (cache must be cleared so next pull doesn't use a terminal id)",
			got,
		)
	}
}

// --- legacy sync pull response ----------------------------------

func TestOperationPull_LegacySyncResponse(t *testing.T) {
	js := newJobServer(t, jobServerConfig{
		startStatus: http.StatusOK,
		startBody:   "legacy-zip",
	})
	c := NewClient(js.srv.URL, "tok", "en")

	_, err := c.OperationPull(context.Background(), "/x")
	if err == nil {
		t.Fatalf("expected error on legacy 200 response")
	}
	if !errors.Is(err, sdkconnectors.ErrLegacySyncPullResponse) {
		t.Fatalf("err %v should wrap ErrLegacySyncPullResponse", err)
	}
}

// --- progress event dedup ----------------------------------------

// countingHandler is a slog.Handler that increments a counter for
// every Handle call. Enabled returns true so forwardProgressEvents
// falls through to the hot path.
type countingHandler struct {
	count *atomic.Int64
}

func (h *countingHandler) Enabled(_ context.Context, _ slog.Level) bool { return true }
func (h *countingHandler) Handle(_ context.Context, _ slog.Record) error {
	h.count.Add(1)
	return nil
}
func (h *countingHandler) WithAttrs(_ []slog.Attr) slog.Handler { return h }
func (h *countingHandler) WithGroup(_ string) slog.Handler      { return h }

// TestForwardProgressEvents_Dedup drives the forwardProgressEvents
// helper directly. Going through the HTTP path would require staging
// multiple status responses and carefully timing the poll loop —
// testing the helper directly gives the same semantic coverage
// without the timing surface.
func TestForwardProgressEvents_Dedup(t *testing.T) {
	c := NewClient("http://example.invalid", "tok", "en")

	var logged atomic.Int64
	c.Logger = slog.New(&countingHandler{count: &logged})

	events := []observability.ProgressEvent{
		{Kind: observability.ProgressKindPage, Page: 1, RecordsSoFar: 100},
		{Kind: observability.ProgressKindPage, Page: 2, RecordsSoFar: 200},
	}
	seen := c.forwardProgressEvents(context.Background(), "job", events, 0)
	if seen != 2 {
		t.Fatalf("seen=%d, want 2", seen)
	}
	if logged.Load() != 2 {
		t.Fatalf("logged %d events, want 2", logged.Load())
	}

	// Re-call with the same slice and updated watermark — nothing
	// should be re-logged.
	seen = c.forwardProgressEvents(context.Background(), "job", events, seen)
	if seen != 2 {
		t.Fatalf("seen=%d after no-op, want 2", seen)
	}
	if logged.Load() != 2 {
		t.Fatalf("logged %d events after no-op, want 2", logged.Load())
	}

	// Append a third event — only the new one should log.
	events = append(events, observability.ProgressEvent{
		Kind:         observability.ProgressKindPage,
		Page:         3,
		RecordsSoFar: 300,
	})
	seen = c.forwardProgressEvents(context.Background(), "job", events, seen)
	if seen != 3 {
		t.Fatalf("seen=%d after append, want 3", seen)
	}
	if logged.Load() != 3 {
		t.Fatalf("logged %d events after append, want 3", logged.Load())
	}
}

// --- doc smoke: PollInterval is the advertised 5s ----------------

// TestPollInterval_Documented guards against accidental drift away
// from the documented 5s cadence that matches the connector-service
// heartbeat. If a future change reduces the interval this test is a
// flag to re-read the operationPull.go heartbeat contract.
func TestPollInterval_Documented(t *testing.T) {
	if PollInterval != 5*time.Second {
		t.Fatalf("PollInterval=%s, want 5s (see heartbeat contract)", PollInterval)
	}
}
