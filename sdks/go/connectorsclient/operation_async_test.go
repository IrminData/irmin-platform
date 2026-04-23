package connectorsclient_test

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/IrminData/irmin-sdk-go/connectorsclient"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/IrminData/irmin-sdk-go/observability"
)

// TestStartOperationPull_HappyPath verifies the 202 + job_id path.
// Also asserts that Authorization / Accept-Language / the connection
// header are stamped on the outbound request, so a future refactor
// that drops applyDefaultHeaders is caught here.
func TestStartOperationPull_HappyPath(t *testing.T) {
	var (
		gotPath       string
		gotAuth       string
		gotLocale     string
		gotConnection string
	)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost || r.URL.Path != "/operation/pull" {
			t.Errorf("unexpected request: %s %s", r.Method, r.URL.Path)
		}
		if err := r.ParseForm(); err != nil {
			t.Fatalf("ParseForm: %v", err)
		}
		gotPath = r.FormValue("path")
		gotAuth = r.Header.Get("Authorization")
		gotLocale = r.Header.Get("Accept-Language")
		gotConnection = r.Header.Get(connectorsclient.HeaderConnectionID)

		w.WriteHeader(http.StatusAccepted)
		_ = json.NewEncoder(w).Encode(irminmodels.StartOperationPullResponse{JobID: "opjob_test123"})
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok_abc", "en").WithConnectionID(42)

	resp, err := c.StartOperationPull(context.Background(), connectorsclient.StartOperationPullRequest{
		Path:  "/v1/customers",
		Extra: map[string]string{"cursor": "abc"},
	})
	if err != nil {
		t.Fatalf("StartOperationPull: %v", err)
	}
	if resp.JobID != "opjob_test123" {
		t.Errorf("JobID = %q, want opjob_test123", resp.JobID)
	}
	if gotPath != "/v1/customers" {
		t.Errorf("form path = %q, want /v1/customers", gotPath)
	}
	if gotAuth != "Bearer tok_abc" {
		t.Errorf("Authorization = %q, want Bearer tok_abc", gotAuth)
	}
	if gotLocale != "en" {
		t.Errorf("Accept-Language = %q, want en", gotLocale)
	}
	if gotConnection != "42" {
		t.Errorf("%s = %q, want 42", connectorsclient.HeaderConnectionID, gotConnection)
	}
}

// TestStartOperationPull_LegacySyncResponse verifies that a 200 OK
// from an unmigrated connector surfaces the ErrLegacySyncPullResponse
// sentinel rather than silently degrading to a sync path.
func TestStartOperationPull_LegacySyncResponse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/zip")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("PK\x03\x04 fake zip bytes"))
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	_, err := c.StartOperationPull(
		context.Background(),
		connectorsclient.StartOperationPullRequest{Path: "/v1/customers"},
	)
	if !errors.Is(err, connectorsclient.ErrLegacySyncPullResponse) {
		t.Fatalf("err = %v, want ErrLegacySyncPullResponse", err)
	}
}

// TestStartOperationPull_NonAcceptedStatus verifies that a non-202,
// non-200 response surfaces as an *APIError carrying the status and
// body for operator diagnostics.
func TestStartOperationPull_NonAcceptedStatus(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte("boom"))
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	_, err := c.StartOperationPull(context.Background(), connectorsclient.StartOperationPullRequest{Path: "/x"})

	var apiErr *connectorsclient.APIError
	if !errors.As(err, &apiErr) {
		t.Fatalf("err = %v, want *APIError", err)
	}
	if apiErr.StatusCode != http.StatusInternalServerError {
		t.Errorf("StatusCode = %d, want 500", apiErr.StatusCode)
	}
	if apiErr.Body != "boom" {
		t.Errorf("Body = %q, want boom", apiErr.Body)
	}
}

// TestStartOperationPull_AcceptedButNoJobID verifies that the
// defensive "no job_id" path triggers a descriptive error; server-side
// bugs would otherwise silently return an empty-job client to Core.
func TestStartOperationPull_AcceptedButNoJobID(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusAccepted)
		_, _ = w.Write([]byte("{}"))
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	_, err := c.StartOperationPull(context.Background(), connectorsclient.StartOperationPullRequest{Path: "/x"})
	if err == nil || !strings.Contains(err.Error(), "did not return a job_id") {
		t.Fatalf("err = %v, want missing-job_id error", err)
	}
}

// TestGetOperationJobStatus_Transitions walks through the expected
// pending → running → complete transitions a Core poll loop will see.
// Ensures each intermediate status deserialises correctly and that
// progress events use the shared observability vocabulary.
func TestGetOperationJobStatus_Transitions(t *testing.T) {
	var calls int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/operation/status/") {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		n := atomic.AddInt32(&calls, 1)
		var status irminmodels.OperationJobStatus
		var progress []observability.ProgressEvent
		switch n {
		case 1:
			status = irminmodels.OperationJobStatusPending
		case 2:
			status = irminmodels.OperationJobStatusRunning
			progress = []observability.ProgressEvent{
				{Kind: observability.ProgressKindPage, ResourcePath: "/v1/customers", Page: 1, RecordsSoFar: 100},
			}
		default:
			status = irminmodels.OperationJobStatusComplete
		}
		_ = json.NewEncoder(w).Encode(irminmodels.OperationJobStatusResponse{
			JobID:    "opjob_test123",
			Status:   status,
			Progress: progress,
		})
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	ctx := context.Background()
	wantStatuses := []irminmodels.OperationJobStatus{
		irminmodels.OperationJobStatusPending,
		irminmodels.OperationJobStatusRunning,
		irminmodels.OperationJobStatusComplete,
	}
	for i, want := range wantStatuses {
		got, err := c.GetOperationJobStatus(ctx, "opjob_test123")
		if err != nil {
			t.Fatalf("call %d: GetOperationJobStatus: %v", i, err)
		}
		if got.Status != want {
			t.Errorf("call %d: Status = %q, want %q", i, got.Status, want)
		}
		if want == irminmodels.OperationJobStatusRunning {
			if len(got.Progress) != 1 || got.Progress[0].Kind != observability.ProgressKindPage {
				t.Errorf("call %d: missing expected page progress event: %+v", i, got.Progress)
			}
		}
		if want.IsTerminal() != got.Status.IsTerminal() {
			t.Errorf("IsTerminal() disagreement for %q", want)
		}
	}
}

// TestGetOperationJobStatus_Failed verifies that a failed job surfaces
// its error message on the response intact, so Core can wrap it with
// JobFailedError at the poll-loop level.
func TestGetOperationJobStatus_Failed(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(irminmodels.OperationJobStatusResponse{
			JobID:  "opjob_test123",
			Status: irminmodels.OperationJobStatusFailed,
			Error:  "stripe API returned 401 Unauthorized",
		})
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	got, err := c.GetOperationJobStatus(context.Background(), "opjob_test123")
	if err != nil {
		t.Fatalf("GetOperationJobStatus: %v", err)
	}
	if got.Status != irminmodels.OperationJobStatusFailed {
		t.Errorf("Status = %q, want failed", got.Status)
	}
	if got.Error != "stripe API returned 401 Unauthorized" {
		t.Errorf("Error = %q, want stripe API message", got.Error)
	}
	if !got.Status.IsTerminal() {
		t.Errorf("expected failed status to be terminal")
	}
}

// TestGetOperationJobStatus_EmptyJobID verifies the guard against an
// empty job_id that would otherwise produce a malformed URL.
func TestGetOperationJobStatus_EmptyJobID(t *testing.T) {
	c := connectorsclient.NewClient("http://example", "tok", "en")
	_, err := c.GetOperationJobStatus(context.Background(), "")
	if err == nil {
		t.Fatalf("expected error for empty jobID")
	}
}

// TestFetchOperationResult_HappyPath verifies streaming delivery of
// the zip body and the caller-owned Close lifecycle.
func TestFetchOperationResult_HappyPath(t *testing.T) {
	want := []byte("PK\x03\x04 fake zip bytes for testing purposes")
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.URL.Path, "/operation/result/") {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/zip")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(want)
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	rc, err := c.FetchOperationResult(context.Background(), "opjob_test123")
	if err != nil {
		t.Fatalf("FetchOperationResult: %v", err)
	}
	defer func() { _ = rc.Close() }()

	got, err := io.ReadAll(rc)
	if err != nil {
		t.Fatalf("ReadAll: %v", err)
	}
	if string(got) != string(want) {
		t.Errorf("body mismatch: got %d bytes, want %d", len(got), len(want))
	}
}

// TestFetchOperationResult_NotReady verifies the 409 → ErrResultNotReady
// mapping, so Core's poll loop can tell the difference between "not yet"
// and "broken" without inspecting the response body.
func TestFetchOperationResult_NotReady(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusConflict)
		_, _ = w.Write([]byte(`{"error":"job still running"}`))
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	rc, err := c.FetchOperationResult(context.Background(), "opjob_test123")
	if rc != nil {
		_ = rc.Close()
		t.Fatalf("expected nil reader on not-ready")
	}
	if !errors.Is(err, connectorsclient.ErrResultNotReady) {
		t.Fatalf("err = %v, want ErrResultNotReady", err)
	}
}

// TestFetchOperationResult_ServerError verifies that a 500 surfaces
// as *APIError (not ErrResultNotReady) so diagnostic bodies surface.
func TestFetchOperationResult_ServerError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte("broken"))
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	rc, err := c.FetchOperationResult(context.Background(), "opjob_test123")
	if rc != nil {
		_ = rc.Close()
		t.Fatalf("expected nil reader on server error")
	}
	var apiErr *connectorsclient.APIError
	if !errors.As(err, &apiErr) {
		t.Fatalf("err = %v, want *APIError", err)
	}
	if apiErr.StatusCode != http.StatusInternalServerError {
		t.Errorf("StatusCode = %d, want 500", apiErr.StatusCode)
	}
}

// TestCancelOperationJob_HappyPath verifies a 204 (or 200) is
// treated as success and that the path is built correctly.
func TestCancelOperationJob_HappyPath(t *testing.T) {
	var gotPath string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		if r.Method != http.MethodPost {
			t.Errorf("method = %s, want POST", r.Method)
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	if err := c.CancelOperationJob(context.Background(), "opjob_test123"); err != nil {
		t.Fatalf("CancelOperationJob: %v", err)
	}
	if gotPath != "/operation/cancel/opjob_test123" {
		t.Errorf("path = %q, want /operation/cancel/opjob_test123", gotPath)
	}
}

// TestJobFailedError_Unwrap verifies errors.Is / errors.As work as
// documented for callers that want to distinguish cancelled from
// failed after wrapping.
func TestJobFailedError_Unwrap(t *testing.T) {
	err := &connectorsclient.JobFailedError{
		Status:  irminmodels.OperationJobStatusFailed,
		Message: "boom",
	}
	if !errors.Is(err, connectorsclient.ErrJobFailed) {
		t.Errorf("errors.Is(err, ErrJobFailed) = false, want true")
	}
	var target *connectorsclient.JobFailedError
	if !errors.As(err, &target) {
		t.Fatalf("errors.As failed")
	}
	if target.Status != irminmodels.OperationJobStatusFailed {
		t.Errorf("target.Status = %q, want failed", target.Status)
	}
	if target.Message != "boom" {
		t.Errorf("target.Message = %q, want boom", target.Message)
	}
}
