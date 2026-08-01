package connectorjobs_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"irmin-api/connectorjobs"

	"github.com/IrminData/irmin-platform/sdks/go/connectorsclient"
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/IrminData/irmin-platform/sdks/go/observability"
)

func TestRunCompletesJob(t *testing.T) {
	job := newTestJob(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/operation/status/opjob_test":
			writeJobStatus(t, w, irminmodels.OperationJobStatusComplete, "")
		default:
			t.Fatalf("unexpected request path %s", r.URL.Path)
		}
	})

	if err := connectorjobs.Run(t.Context(), job); err != nil {
		t.Fatalf("Run() error = %v", err)
	}
}

func TestRunReturnsTypedJobFailedError(t *testing.T) {
	job := newTestJob(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/operation/status/opjob_test":
			writeJobStatus(t, w, irminmodels.OperationJobStatusFailed, "boom")
		default:
			t.Fatalf("unexpected request path %s", r.URL.Path)
		}
	})

	err := connectorjobs.Run(t.Context(), job)
	var failedErr *connectorsclient.JobFailedError
	if !errors.As(err, &failedErr) {
		t.Fatalf("Run() error = %v, want *JobFailedError", err)
	}
	if failedErr.Status != irminmodels.OperationJobStatusFailed || failedErr.Message != "boom" {
		t.Fatalf("JobFailedError = (%q, %q), want (failed, boom)", failedErr.Status, failedErr.Message)
	}
}

func TestRunCancelsAndMarksWaitErrorOnPollFailure(t *testing.T) {
	var cancelCalls atomic.Int32
	var statusCalls atomic.Int32
	job := newTestJob(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/operation/status/opjob_test":
			statusCalls.Add(1)
			http.Error(w, "status unavailable", http.StatusInternalServerError)
		case "/operation/cancel/opjob_test":
			cancelCalls.Add(1)
			w.WriteHeader(http.StatusNoContent)
		default:
			t.Fatalf("unexpected request path %s", r.URL.Path)
		}
	})

	err := connectorjobs.Run(t.Context(), job)
	if !connectorjobs.IsWaitError(err) {
		t.Fatalf("Run() error = %v, want WaitError", err)
	}
	// Run tolerates MaxConsecutiveStatusPollErrors transient failures
	// before giving up, so the server must have been hit at least
	// that many times before Run returned.
	if got := statusCalls.Load(); got < int32(connectorjobs.MaxConsecutiveStatusPollErrors) {
		t.Fatalf(
			"status calls = %d, want >= %d (MaxConsecutiveStatusPollErrors)",
			got, connectorjobs.MaxConsecutiveStatusPollErrors,
		)
	}
	// bestEffortCancel runs in a detached goroutine so the cancel
	// request races with the Run return. Wait briefly for it.
	deadline := time.Now().Add(2 * time.Second)
	for cancelCalls.Load() == 0 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if got := cancelCalls.Load(); got != 1 {
		t.Fatalf("cancel calls = %d, want 1", got)
	}
}

func TestRunCancelsAndMarksWaitErrorOnContextCancellation(t *testing.T) {
	var cancelCalls atomic.Int32
	job := newTestJob(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/operation/status/opjob_test":
			writeJobStatus(t, w, irminmodels.OperationJobStatusRunning, "")
		case "/operation/cancel/opjob_test":
			cancelCalls.Add(1)
			w.WriteHeader(http.StatusNoContent)
		default:
			t.Fatalf("unexpected request path %s", r.URL.Path)
		}
	})

	ctx, cancel := context.WithCancel(t.Context())
	cancel()
	err := connectorjobs.Run(ctx, job)
	if !connectorjobs.IsWaitError(err) {
		t.Fatalf("Run() error = %v, want WaitError", err)
	}
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("Run() error = %v, want context.Canceled", err)
	}
	// bestEffortCancel runs detached — wait for the round-trip.
	deadline := time.Now().Add(2 * time.Second)
	for cancelCalls.Load() == 0 && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
	}
	if got := cancelCalls.Load(); got != 1 {
		t.Fatalf("cancel calls = %d, want 1", got)
	}
}

func TestRunStreamsProgressEvents(t *testing.T) {
	// Server emits two events on the first poll, three on the
	// second (one new), then completes. The handler must receive
	// each event exactly once.
	first := []observability.ProgressEvent{
		{Kind: observability.ProgressKindPage, Page: 1, RecordsSoFar: 100},
		{Kind: observability.ProgressKindPage, Page: 2, RecordsSoFar: 200},
	}
	second := make([]observability.ProgressEvent, 0, len(first)+1)
	second = append(second, first...)
	second = append(second, observability.ProgressEvent{
		Kind: observability.ProgressKindPage, Page: 3, RecordsSoFar: 300,
	})

	var calls atomic.Int32
	job := newTestJob(t, func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/operation/status/opjob_test":
			n := calls.Add(1)
			w.Header().Set("Content-Type", "application/json")
			switch n {
			case 1:
				_ = json.NewEncoder(w).Encode(irminmodels.OperationJobStatusResponse{
					JobID: "opjob_test", Status: irminmodels.OperationJobStatusRunning, Progress: first,
				})
			case 2:
				_ = json.NewEncoder(w).Encode(irminmodels.OperationJobStatusResponse{
					JobID: "opjob_test", Status: irminmodels.OperationJobStatusComplete, Progress: second,
				})
			default:
				t.Fatalf("unexpected status poll %d", n)
			}
		default:
			t.Fatalf("unexpected request path %s", r.URL.Path)
		}
	})

	var seen []observability.ProgressEvent
	ctx := connectorjobs.ContextWithProgress(t.Context(), func(evt observability.ProgressEvent) {
		seen = append(seen, evt)
	})

	if err := connectorjobs.Run(ctx, job); err != nil {
		t.Fatalf("Run() error = %v", err)
	}
	if len(seen) != 3 {
		t.Fatalf("seen %d events, want 3 (each delivered exactly once)", len(seen))
	}
	for i, want := range second {
		if seen[i].Page != want.Page {
			t.Fatalf("event %d page = %d, want %d", i, seen[i].Page, want.Page)
		}
	}
}

func newTestJob(t *testing.T, handler http.HandlerFunc) *connectorsclient.OperationJob {
	t.Helper()

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/operation/pull" {
			w.WriteHeader(http.StatusAccepted)
			_ = json.NewEncoder(w).Encode(irminmodels.StartOperationJobResponse{
				JobID:          "opjob_test",
				OperationToken: "optk_test",
			})
			return
		}
		handler(w, r)
	}))
	t.Cleanup(srv.Close)

	client := connectorsclient.NewClient(srv.URL, "tok")
	client.HTTPClient.Timeout = 2 * time.Second
	job, err := client.StartOperationPull(t.Context(), connectorsclient.StartOperationPullRequest{Path: "/x"})
	if err != nil {
		t.Fatalf("StartOperationPull: %v", err)
	}
	return job
}

func writeJobStatus(
	t *testing.T,
	w http.ResponseWriter,
	status irminmodels.OperationJobStatus,
	message string,
) {
	t.Helper()
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(irminmodels.OperationJobStatusResponse{
		JobID:  "opjob_test",
		Status: status,
		Error:  message,
	})
}
