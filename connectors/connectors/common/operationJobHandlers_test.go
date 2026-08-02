//nolint:testpackage // white-box test needs package-private helpers (registerJobHandlers, memJobStore)
package common

import (
	"io"
	"log/slog"
	"net/http"
	"os"
	"testing"
	"time"

	"irmin-connectors/db"

	sdkmodels "github.com/IrminData/irmin-platform/sdks/go/models"
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

// seedJobWithToken seeds an OperationJob row with an explicit per-job
// operation token. Phase 4 lifecycle routes authenticate against
// OperationJob.OperationToken, not Operation.Token, so tests that
// exercise the auth boundary now plug in the token they expect to
// pass through validateJobOperationToken. Pass "" for the legacy
// behaviour (token mismatch on every Authorization header).
func seedJobWithToken(t *testing.T, store *memJobStore, jobID string, operationID uint, token string) {
	t.Helper()
	job := &db.OperationJob{
		JobID:                   jobID,
		ConnectorRegistrationID: 1,
		ConnectorName:           "test",
		OperationID:             operationID,
		Status:                  "running",
		Progress:                []byte("[]"),
		OperationToken:          token,
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

// TestJobRoutesMountedUnderConnectorSlug exercises the per-connector
// mount registered by MountJobHandlersOnGroup. The SDK builds
// lifecycle URLs as "{connector_base_url}/operation/{status,result,
// cancel}/{job_id}" where connector_base_url already includes the
// "/{slug}" prefix Core resolved at registration time. A root-only
// mount returns 404 on every poll — see operationJobHandlers.go for
// the rationale on why both mounts coexist.
func TestJobRoutesMountedUnderConnectorSlug(t *testing.T) {
	store := newMemJobStore()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	manager := NewJobManagerWithStore(store, logger, JobManagerConfig{
		TTL:             DefaultJobTTL,
		JanitorInterval: 24 * time.Hour,
		ResultDir:       t.TempDir(),
	})
	t.Cleanup(manager.StopJanitor)

	operationStore := &fakeOperationStore{operations: map[uint]*db.Operation{
		42: {Model: gorm.Model{ID: 42}},
	}}

	app := fiber.New()
	// Mount the lifecycle routes under a connector group, exactly as
	// SetupConnectorRoutes does in production.
	group := app.Group("/stripe")
	registerJobHandlers(group, manager, operationStore)
	seedJobWithToken(t, store, "opjob_under_slug", 42, "token-xyz")

	resp := doJobRequest(
		t,
		app,
		http.MethodGet,
		"http://localhost/stripe/operation/status/opjob_under_slug",
		"Bearer token-xyz",
	)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status under /stripe/ = %d, want 200 (route mismatch regression)", resp.StatusCode)
	}
}

func TestJobRoutesRequireMatchingOperationToken(t *testing.T) {
	app, store, opStore := newJobHandlerTestApp(t)
	// Phase 4: lifecycle auth keys off OperationJob.OperationToken,
	// not the long-lived per-Connection Operation.Token. The
	// Operation row is still seeded so the worker can read its
	// Details / Settings, but its Token field is irrelevant to the
	// per-job lifecycle routes — tests still populate it for parity
	// with the legacy schema.
	seedJobWithToken(t, store, "opjob_abc", 99, "token-123")
	opStore.operations[99] = &db.Operation{
		Model: gorm.Model{ID: 99},
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
	seedJobWithToken(t, store, "opjob_auth_required", 51, "job-token")
	opStore.operations[51] = &db.Operation{
		Model: gorm.Model{ID: 51},
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
	seedJobWithToken(t, store, "opjob_cancel", 7, "cancel-token")
	opStore.operations[7] = &db.Operation{
		Model: gorm.Model{ID: 7},
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
	seedJobWithToken(t, store, "opjob_result", 33, "result-token")
	opStore.operations[33] = &db.Operation{
		Model: gorm.Model{ID: 33},
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

// Phase 4 retired the orphan-operation and operation-lookup-failure
// branches in validateJobOperationToken — the lifecycle auth path no
// longer reads the Operation row at all (the per-job operation token
// lives on OperationJob.OperationToken), so those branches are
// unreachable and the tests that exercised them have been removed.
// The job-not-found path is still covered by
// TestJobAuthReturnsNotFoundWhenJobMissing above.

func TestJobResultEmptyResultPathDependsOnOperationKind(t *testing.T) {
	app, store, opStore := newJobHandlerTestApp(t)
	opStore.operations[88] = &db.Operation{
		Model: gorm.Model{ID: 88},
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
				OperationToken:          "result-kind-token",
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
		OperationToken:          "result-token",
	}
	if _, err := store.CreateOperationJob(job); err != nil {
		t.Fatalf("seed job: %v", err)
	}
	opStore.operations[operationID] = &db.Operation{
		Model: gorm.Model{ID: operationID},
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
		OperationToken:          "result-token",
	}
	if _, err := store.CreateOperationJob(job); err != nil {
		t.Fatalf("seed job: %v", err)
	}
	opStore.operations[operationID] = &db.Operation{
		Model: gorm.Model{ID: operationID},
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
