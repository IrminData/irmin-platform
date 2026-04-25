//nolint:testpackage // white-box test needs package-private helpers (registerJobHandlers, memJobStore)
package common

import (
	"errors"
	"io"
	"log/slog"
	"net/http"
	"os"
	"testing"
	"time"

	"irmin-connectors/db"

	sdkmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

type fakeOperationStore struct {
	operations map[uint]*db.Operation
	err        error
}

func (s *fakeOperationStore) GetOperationByID(id uint) (*db.Operation, error) {
	if s.err != nil {
		return nil, s.err
	}
	op, ok := s.operations[id]
	if !ok {
		return nil, gorm.ErrRecordNotFound
	}
	return op, nil
}

func newJobHandlerTestApp(t *testing.T) (*fiber.App, *memJobStore, *fakeOperationStore) {
	t.Helper()
	store := newMemJobStore()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	manager := NewJobManagerWithStore(store, logger, JobManagerConfig{
		TTL:             DefaultJobTTL,
		JanitorInterval: 24 * time.Hour,
		ResultDir:       t.TempDir(),
	})
	t.Cleanup(manager.StopJanitor)

	operationStore := &fakeOperationStore{
		operations: make(map[uint]*db.Operation),
	}

	app := fiber.New()
	registerJobHandlers(app, manager, operationStore)
	return app, store, operationStore
}

func seedJob(t *testing.T, store *memJobStore, jobID string, operationID uint) {
	t.Helper()
	job := &db.OperationJob{
		JobID:                   jobID,
		ConnectorRegistrationID: 1,
		ConnectorName:           "test",
		OperationID:             operationID,
		Status:                  "running",
		Progress:                []byte("[]"),
	}
	if _, err := store.CreateOperationJob(job); err != nil {
		t.Fatalf("seed job: %v", err)
	}
}

func doJobRequest(
	t *testing.T,
	app *fiber.App,
	method string,
	url string,
	authHeader string,
) *http.Response {
	t.Helper()
	req, err := http.NewRequest(method, url, http.NoBody)
	if err != nil {
		t.Fatalf("build request: %v", err)
	}
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	resp, err := app.Test(req, fiber.TestConfig{Timeout: -1})
	if err != nil {
		t.Fatalf("app.Test: %v", err)
	}
	return resp
}

func TestJobRoutesRequireMatchingOperationToken(t *testing.T) {
	app, store, opStore := newJobHandlerTestApp(t)
	seedJob(t, store, "opjob_abc", 99)
	opStore.operations[99] = &db.Operation{
		Model: gorm.Model{ID: 99},
		Token: "token-123",
	}

	t.Run("missing authorization", func(t *testing.T) {
		resp := doJobRequest(t, app, http.MethodGet, "http://localhost/operation/status/opjob_abc", "")
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("status = %d, want 401", resp.StatusCode)
		}
	})

	t.Run("wrong operation token", func(t *testing.T) {
		resp := doJobRequest(
			t,
			app,
			http.MethodGet,
			"http://localhost/operation/status/opjob_abc",
			"Bearer wrong-token",
		)
		if resp.StatusCode != http.StatusUnauthorized {
			t.Fatalf("status = %d, want 401", resp.StatusCode)
		}
	})

	t.Run("valid operation token", func(t *testing.T) {
		resp := doJobRequest(
			t,
			app,
			http.MethodGet,
			"http://localhost/operation/status/opjob_abc",
			"Bearer token-123",
		)
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("status = %d, want 200", resp.StatusCode)
		}
	})
}

func TestAllJobRoutesRequireAuthorizationHeader(t *testing.T) {
	app, store, opStore := newJobHandlerTestApp(t)
	seedJob(t, store, "opjob_auth_required", 51)
	opStore.operations[51] = &db.Operation{
		Model: gorm.Model{ID: 51},
		Token: "job-token",
	}

	tests := []struct {
		name   string
		method string
		url    string
	}{
		{
			name:   "status route",
			method: http.MethodGet,
			url:    "http://localhost/operation/status/opjob_auth_required",
		},
		{
			name:   "result route",
			method: http.MethodGet,
			url:    "http://localhost/operation/result/opjob_auth_required",
		},
		{
			name:   "cancel route",
			method: http.MethodPost,
			url:    "http://localhost/operation/cancel/opjob_auth_required",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resp := doJobRequest(t, app, tt.method, tt.url, "")
			if resp.StatusCode != http.StatusUnauthorized {
				t.Fatalf("status = %d, want 401", resp.StatusCode)
			}
		})
	}
}

func TestJobCancelRouteRequiresMatchingOperationToken(t *testing.T) {
	app, store, opStore := newJobHandlerTestApp(t)
	seedJob(t, store, "opjob_cancel", 7)
	opStore.operations[7] = &db.Operation{
		Model: gorm.Model{ID: 7},
		Token: "cancel-token",
	}

	unauth := doJobRequest(t, app, http.MethodPost, "http://localhost/operation/cancel/opjob_cancel", "")
	if unauth.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", unauth.StatusCode)
	}

	wrong := doJobRequest(
		t,
		app,
		http.MethodPost,
		"http://localhost/operation/cancel/opjob_cancel",
		"Bearer wrong",
	)
	if wrong.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", wrong.StatusCode)
	}

	valid := doJobRequest(
		t,
		app,
		http.MethodPost,
		"http://localhost/operation/cancel/opjob_cancel",
		"Bearer cancel-token",
	)
	if valid.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", valid.StatusCode)
	}
}

func TestJobResultRouteRequiresMatchingOperationToken(t *testing.T) {
	app, store, opStore := newJobHandlerTestApp(t)
	seedJob(t, store, "opjob_result", 33)
	opStore.operations[33] = &db.Operation{
		Model: gorm.Model{ID: 33},
		Token: "result-token",
	}

	resp := doJobRequest(
		t,
		app,
		http.MethodGet,
		"http://localhost/operation/result/opjob_result",
		"Bearer wrong",
	)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", resp.StatusCode)
	}

	valid := doJobRequest(
		t,
		app,
		http.MethodGet,
		"http://localhost/operation/result/opjob_result",
		"Bearer result-token",
	)
	if valid.StatusCode != http.StatusConflict {
		t.Fatalf("status = %d, want 409", valid.StatusCode)
	}
}

func TestJobAuthReturnsNotFoundWhenJobMissing(t *testing.T) {
	app, _, _ := newJobHandlerTestApp(t)
	resp := doJobRequest(
		t,
		app,
		http.MethodGet,
		"http://localhost/operation/status/opjob_unknown",
		"Bearer token",
	)
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

func TestJobAuthReturnsNotFoundWhenOperationMissing(t *testing.T) {
	app, store, _ := newJobHandlerTestApp(t)
	seedJob(t, store, "opjob_orphan", 321)
	resp := doJobRequest(
		t,
		app,
		http.MethodGet,
		"http://localhost/operation/status/opjob_orphan",
		"Bearer token",
	)
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", resp.StatusCode)
	}
}

func TestJobAuthReturnsInternalServerErrorOnOperationLookupFailure(t *testing.T) {
	app, store, opStore := newJobHandlerTestApp(t)
	seedJob(t, store, "opjob_lookup_failure", 11)
	opStore.err = errors.New("db unavailable")

	resp := doJobRequest(
		t,
		app,
		http.MethodGet,
		"http://localhost/operation/status/opjob_lookup_failure",
		"Bearer token",
	)
	if resp.StatusCode != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", resp.StatusCode)
	}
}

func TestJobResultEmptyResultPathDependsOnOperationKind(t *testing.T) {
	app, store, opStore := newJobHandlerTestApp(t)
	opStore.operations[88] = &db.Operation{
		Model: gorm.Model{ID: 88},
		Token: "result-kind-token",
	}

	tests := []struct {
		name       string
		jobID      string
		kind       string
		wantStatus int
	}{
		{
			name:       "push has no artifact",
			jobID:      "opjob_push_no_artifact",
			kind:       operationKindPush,
			wantStatus: http.StatusNoContent,
		},
		{
			name:       "patch has no artifact",
			jobID:      "opjob_patch_no_artifact",
			kind:       operationKindPatch,
			wantStatus: http.StatusNoContent,
		},
		{
			name:       "pull missing artifact is expired",
			jobID:      "opjob_pull_missing_artifact",
			kind:       operationKindPull,
			wantStatus: http.StatusGone,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := store.CreateOperationJob(&db.OperationJob{
				JobID:                   tt.jobID,
				ConnectorRegistrationID: 1,
				ConnectorName:           "test",
				OperationID:             88,
				Kind:                    tt.kind,
				Status:                  "complete",
				Progress:                []byte("[]"),
			}); err != nil {
				t.Fatalf("seed complete job: %v", err)
			}

			resp := doJobRequest(
				t,
				app,
				http.MethodGet,
				"http://localhost/operation/result/"+tt.jobID,
				"Bearer result-kind-token",
			)
			if resp.StatusCode != tt.wantStatus {
				t.Fatalf("status = %d, want %d", resp.StatusCode, tt.wantStatus)
			}
		})
	}
}

func TestJobResultReturnsGoneWhenPersistedFileMissing(t *testing.T) {
	app, store, opStore := newJobHandlerTestApp(t)
	operationID := uint(801)
	job := &db.OperationJob{
		JobID:                   "opjob_missing_file",
		ConnectorRegistrationID: 1,
		ConnectorName:           "test",
		OperationID:             operationID,
		Kind:                    "pull",
		Status:                  string(sdkmodels.OperationJobStatusComplete),
		Progress:                []byte("[]"),
		ResultPath:              t.TempDir() + "/missing.zip",
	}
	if _, err := store.CreateOperationJob(job); err != nil {
		t.Fatalf("seed job: %v", err)
	}
	opStore.operations[operationID] = &db.Operation{
		Model: gorm.Model{ID: operationID},
		Token: "result-token",
	}

	resp := doJobRequest(
		t,
		app,
		http.MethodGet,
		"http://localhost/operation/result/opjob_missing_file",
		"Bearer result-token",
	)
	if resp.StatusCode != http.StatusGone {
		t.Fatalf("status = %d, want 410", resp.StatusCode)
	}
}

func TestJobResultStreamsExistingFile(t *testing.T) {
	app, store, opStore := newJobHandlerTestApp(t)
	operationID := uint(802)
	resultPath := t.TempDir() + "/result.zip"
	if err := os.WriteFile(resultPath, []byte("zip-bytes"), 0o600); err != nil {
		t.Fatalf("write result: %v", err)
	}
	job := &db.OperationJob{
		JobID:                   "opjob_existing_file",
		ConnectorRegistrationID: 1,
		ConnectorName:           "test",
		OperationID:             operationID,
		Kind:                    "pull",
		Status:                  string(sdkmodels.OperationJobStatusComplete),
		Progress:                []byte("[]"),
		ResultPath:              resultPath,
	}
	if _, err := store.CreateOperationJob(job); err != nil {
		t.Fatalf("seed job: %v", err)
	}
	opStore.operations[operationID] = &db.Operation{
		Model: gorm.Model{ID: operationID},
		Token: "result-token",
	}

	resp := doJobRequest(
		t,
		app,
		http.MethodGet,
		"http://localhost/operation/result/opjob_existing_file",
		"Bearer result-token",
	)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
}
