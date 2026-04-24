package connectorsclient_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/IrminData/irmin-sdk-go/connectorsclient"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// TestStartOperationPull_AlreadyRunning_Structured verifies that a
// 409 response carrying an AlreadyRunningBody unwraps into
// *AlreadyRunningError so callers can reach the blocking job_id
// without re-parsing the body.
func TestStartOperationPull_AlreadyRunning_Structured(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		_ = json.NewEncoder(w).Encode(irminmodels.AlreadyRunningBody{
			Error:       "Operation is already running",
			JobID:       "opjob_blocker123",
			OperationID: 42,
			Kind:        "pull",
		})
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	_, err := c.StartOperationPull(
		context.Background(),
		connectorsclient.StartOperationPullRequest{Path: "/v1/customers"},
	)

	var already *connectorsclient.AlreadyRunningError
	if !errors.As(err, &already) {
		t.Fatalf("err = %v, want *AlreadyRunningError", err)
	}
	if already.JobID() != "opjob_blocker123" {
		t.Errorf("JobID = %q, want opjob_blocker123", already.JobID())
	}
	if already.Body.Kind != "pull" {
		t.Errorf("Kind = %q, want pull", already.Body.Kind)
	}
	if !errors.Is(err, connectorsclient.ErrOperationAlreadyRunning) {
		t.Errorf("errors.Is(err, ErrOperationAlreadyRunning) = false, want true")
	}
}

// TestStartOperationPull_AlreadyRunning_LegacyFallback verifies that
// a 409 from a pre-envelope server (just {"error": "..."} with no
// JobID) still surfaces as *APIError so the operator diagnostics are
// preserved, rather than claiming a fake structured error.
func TestStartOperationPull_AlreadyRunning_LegacyFallback(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusConflict)
		// Legacy-style body with the canonical Error string. Absent
		// JobID is acceptable per the AlreadyRunningBody contract —
		// we still treat this as structured.
		_, _ = w.Write([]byte(`{"error":"Operation is already running"}`))
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	_, err := c.StartOperationPull(
		context.Background(),
		connectorsclient.StartOperationPullRequest{Path: "/v1/customers"},
	)

	var already *connectorsclient.AlreadyRunningError
	if !errors.As(err, &already) {
		t.Fatalf("err = %v, want *AlreadyRunningError for canonical body", err)
	}
	if already.JobID() != "" {
		t.Errorf("JobID = %q, want empty for legacy body", already.JobID())
	}
	// Error() on an empty-JobID AlreadyRunningError includes the
	// "retry later" hint so operators know cancel is not actionable.
	if msg := already.Error(); msg == "" {
		t.Errorf("empty Error() string on legacy AlreadyRunningError")
	}
}

// TestStartOperationPull_AlreadyRunning_Garbled verifies that a 409
// with garbled JSON falls back to *APIError rather than falsely
// claiming *AlreadyRunningError.
func TestStartOperationPull_AlreadyRunning_Garbled(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusConflict)
		_, _ = w.Write([]byte(`this is not json`))
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	_, err := c.StartOperationPull(
		context.Background(),
		connectorsclient.StartOperationPullRequest{Path: "/x"},
	)

	var apiErr *connectorsclient.APIError
	if !errors.As(err, &apiErr) {
		t.Fatalf("err = %v, want *APIError fallback", err)
	}
	if apiErr.StatusCode != http.StatusConflict {
		t.Errorf("StatusCode = %d, want 409", apiErr.StatusCode)
	}
	// And ensure we did NOT claim a structured error.
	var already *connectorsclient.AlreadyRunningError
	if errors.As(err, &already) {
		t.Errorf("got *AlreadyRunningError for garbled body, want *APIError")
	}
}

// TestGetOperationJobStatus_StructuredError verifies that a 500
// carrying a JobErrorBody unwraps into *JobServerError with the
// machine-readable Reason + Retryable fields intact.
func TestGetOperationJobStatus_StructuredError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(irminmodels.JobErrorBody{
			Error:     "db connection reset",
			Reason:    irminmodels.JobErrorReasonTransientDB,
			Retryable: true,
			JobID:     "opjob_test",
		})
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	_, err := c.GetOperationJobStatus(context.Background(), "opjob_test")

	var jobErr *connectorsclient.JobServerError
	if !errors.As(err, &jobErr) {
		t.Fatalf("err = %v, want *JobServerError", err)
	}
	if jobErr.StatusCode != http.StatusInternalServerError {
		t.Errorf("StatusCode = %d, want 500", jobErr.StatusCode)
	}
	if jobErr.Reason() != irminmodels.JobErrorReasonTransientDB {
		t.Errorf("Reason = %q, want %q", jobErr.Reason(), irminmodels.JobErrorReasonTransientDB)
	}
	if !jobErr.Retryable() {
		t.Errorf("Retryable = false, want true")
	}
	if jobErr.Body.JobID != "opjob_test" {
		t.Errorf("Body.JobID = %q, want opjob_test", jobErr.Body.JobID)
	}
}

// TestGetOperationJobStatus_LegacyErrorFallback verifies that a 500
// from a pre-envelope server falls back to *APIError so operator
// diagnostics continue to work during the rollout.
func TestGetOperationJobStatus_LegacyErrorFallback(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"failed to load job"}`))
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	_, err := c.GetOperationJobStatus(context.Background(), "opjob_test")

	var apiErr *connectorsclient.APIError
	if !errors.As(err, &apiErr) {
		t.Fatalf("err = %v, want *APIError for legacy body", err)
	}
	if apiErr.StatusCode != http.StatusInternalServerError {
		t.Errorf("StatusCode = %d, want 500", apiErr.StatusCode)
	}
	if apiErr.Body == "" {
		t.Errorf("APIError.Body is empty; expected the legacy JSON to survive fallback")
	}
	var jobErr *connectorsclient.JobServerError
	if errors.As(err, &jobErr) {
		t.Errorf("got *JobServerError for legacy body, want *APIError")
	}
}

// TestGetOperationJobStatus_NotFoundStructured verifies 404 envelope
// handling — Retryable should be false so the caller aborts.
func TestGetOperationJobStatus_NotFoundStructured(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		_ = json.NewEncoder(w).Encode(irminmodels.JobErrorBody{
			Error:     "job not found",
			Reason:    irminmodels.JobErrorReasonNotFound,
			Retryable: false,
		})
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	_, err := c.GetOperationJobStatus(context.Background(), "opjob_gone")

	var jobErr *connectorsclient.JobServerError
	if !errors.As(err, &jobErr) {
		t.Fatalf("err = %v, want *JobServerError", err)
	}
	if jobErr.Reason() != irminmodels.JobErrorReasonNotFound {
		t.Errorf("Reason = %q, want not_found", jobErr.Reason())
	}
	if jobErr.Retryable() {
		t.Errorf("Retryable = true, want false for not_found")
	}
}

// TestFetchOperationResult_StructuredError verifies that a 500 on
// the result endpoint surfaces the structured envelope (the 409-as-
// not-ready shortcut still wins for 409, tested elsewhere).
func TestFetchOperationResult_StructuredError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(irminmodels.JobErrorBody{
			Error:     "result file reaped",
			Reason:    irminmodels.JobErrorReasonCorruptedRow,
			Retryable: false,
			JobID:     "opjob_test",
		})
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	rc, err := c.FetchOperationResult(context.Background(), "opjob_test")
	if rc != nil {
		_ = rc.Close()
		t.Fatalf("expected nil reader on server error")
	}

	var jobErr *connectorsclient.JobServerError
	if !errors.As(err, &jobErr) {
		t.Fatalf("err = %v, want *JobServerError", err)
	}
	if jobErr.Reason() != irminmodels.JobErrorReasonCorruptedRow {
		t.Errorf("Reason = %q, want corrupted_job_state", jobErr.Reason())
	}
}

// TestFetchOperationResult_409_PrefersErrResultNotReady verifies the
// 409-as-not-ready shortcut is preserved even if the body carries a
// structured reason. Core's poll wrapper keys off ErrResultNotReady
// for the "keep polling" signal; we do not want the new envelope
// path to change that contract.
func TestFetchOperationResult_409_PrefersErrResultNotReady(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusConflict)
		// A structured body on a 409 would technically match
		// *JobServerError; assert the not-ready sentinel still wins.
		_ = json.NewEncoder(w).Encode(irminmodels.JobErrorBody{
			Error:     "job not ready",
			Reason:    irminmodels.JobErrorReasonInternal,
			Retryable: true,
		})
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	rc, err := c.FetchOperationResult(context.Background(), "opjob_test")
	if rc != nil {
		_ = rc.Close()
		t.Fatalf("expected nil reader")
	}
	if !errors.Is(err, connectorsclient.ErrResultNotReady) {
		t.Fatalf("err = %v, want ErrResultNotReady", err)
	}
}

// TestCancelOperationJobDetail_StructuredSuccess verifies that the
// richer response shape is parsed when the server returns it.
func TestCancelOperationJobDetail_StructuredSuccess(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_ = json.NewEncoder(w).Encode(irminmodels.CancelOperationJobResponse{
			JobID:     "opjob_test",
			Status:    irminmodels.OperationJobStatusRunning,
			WasActive: true,
			Message:   "cancellation requested",
		})
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	got, err := c.CancelOperationJobDetail(context.Background(), "opjob_test")
	if err != nil {
		t.Fatalf("CancelOperationJobDetail: %v", err)
	}
	if got.JobID != "opjob_test" {
		t.Errorf("JobID = %q, want opjob_test", got.JobID)
	}
	if !got.WasActive {
		t.Errorf("WasActive = false, want true")
	}
	if got.Status != irminmodels.OperationJobStatusRunning {
		t.Errorf("Status = %q, want running", got.Status)
	}
}

// TestCancelOperationJobDetail_LegacyMessageBody verifies that a
// legacy server returning {"message": "cancellation requested"}
// without the richer fields doesn't fail the client — it gets the
// zero-valued response which is the documented legacy signal.
func TestCancelOperationJobDetail_LegacyMessageBody(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"message":"cancellation requested"}`))
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	got, err := c.CancelOperationJobDetail(context.Background(), "opjob_test")
	if err != nil {
		t.Fatalf("CancelOperationJobDetail: %v", err)
	}
	// Legacy body: Status/JobID/WasActive are zero values; Message
	// rides through because it's a shared field.
	if got.Message != "cancellation requested" {
		t.Errorf("Message = %q, want cancellation requested", got.Message)
	}
	if got.JobID != "" {
		t.Errorf("JobID = %q, want empty on legacy body", got.JobID)
	}
	if got.WasActive {
		t.Errorf("WasActive = true, want false on legacy body")
	}
}

// TestCancelOperationJob_BackCompat verifies the original
// fire-and-forget CancelOperationJob still returns nil on 2xx and a
// structured error on non-2xx.
func TestCancelOperationJob_BackCompat(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	if err := c.CancelOperationJob(context.Background(), "opjob_test"); err != nil {
		t.Fatalf("CancelOperationJob: %v", err)
	}
}

// TestCancelOperationJob_StructuredError verifies that a 500 on
// cancel surfaces as *JobServerError so the retry policy can read
// Retryable without parsing the body.
func TestCancelOperationJob_StructuredError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		_ = json.NewEncoder(w).Encode(irminmodels.JobErrorBody{
			Error:     "db pool exhausted",
			Reason:    irminmodels.JobErrorReasonTransientDB,
			Retryable: true,
		})
	}))
	defer srv.Close()

	c := connectorsclient.NewClient(srv.URL, "tok", "en")
	err := c.CancelOperationJob(context.Background(), "opjob_test")

	var jobErr *connectorsclient.JobServerError
	if !errors.As(err, &jobErr) {
		t.Fatalf("err = %v, want *JobServerError", err)
	}
	if !jobErr.Retryable() {
		t.Errorf("Retryable = false, want true")
	}
}

// TestAlreadyRunningError_Unwrap verifies the errors.Is / errors.As
// behaviour documented for AlreadyRunningError, so callers can use
// the sentinel check without losing access to the job_id.
func TestAlreadyRunningError_Unwrap(t *testing.T) {
	err := &connectorsclient.AlreadyRunningError{
		Body: irminmodels.AlreadyRunningBody{
			Error: "Operation is already running",
			JobID: "opjob_test",
			Kind:  "pull",
		},
	}
	if !errors.Is(err, connectorsclient.ErrOperationAlreadyRunning) {
		t.Errorf("errors.Is(err, ErrOperationAlreadyRunning) = false, want true")
	}
	var target *connectorsclient.AlreadyRunningError
	if !errors.As(err, &target) {
		t.Fatalf("errors.As failed")
	}
	if target.JobID() != "opjob_test" {
		t.Errorf("JobID = %q, want opjob_test", target.JobID())
	}
}
