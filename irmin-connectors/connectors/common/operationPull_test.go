//nolint:testpackage // white-box tests exercise the unexported Begin/Guard lock seam and the pull worker internals.
package common

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"irmin-connectors/db"
	"irmin-connectors/models"
	"log/slog"
	"net/http"
	"strings"
	"testing"

	sdkmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

// lockProbePullProvider is a PullOperationProvider that records
// whether any of its entry points were ever called. Tests that
// exercise the "lock unavailable → don't run the worker" path use
// this to assert the provider stayed dormant under contention.
type lockProbePullProvider struct {
	initializeCalled bool
}

func (p *lockProbePullProvider) InitializeClient(
	_ context.Context,
	_ *slog.Logger,
	_ *db.Operation,
) (any, *string, func(), error) {
	p.initializeCalled = true
	return nil, nil, func() {}, errors.New("initialize should not run when lock is unavailable")
}

func (p *lockProbePullProvider) GetAllFiles(
	_ context.Context,
	_ any,
	_ *db.Operation,
) ([]string, [][]byte, error) {
	return nil, nil, errors.New("GetAllFiles should not run when lock is unavailable")
}

func (p *lockProbePullProvider) GetFileByPath(
	_ context.Context,
	_ any,
	_ *db.Operation,
	_ string,
) (string, []byte, error) {
	return "", nil, errors.New("GetFileByPath should not run when lock is unavailable")
}

func (p *lockProbePullProvider) ProgressHandler(_ *db.Operation) ProgressHandler {
	return nil
}

// TestHandleOperationPullReturns409WithJobIDWhenOperationAlreadyRunning
// is the end-to-end assertion for the headline behaviour of this
// rollout: the connector service must surface the blocking job's ID
// on every 409, via the sdkmodels.AlreadyRunningBody wire shape, so
// the caller can cancel or poll it. We drive contention by calling
// Begin twice on the same operation ID using the in-memory JobStore
// and then invoking HandleOperationPull — the second Begin inside
// the handler hits the in-memory lock and must return a structured
// 409 carrying JobID of the first Begin's row.
func TestHandleOperationPullReturns409WithJobIDWhenOperationAlreadyRunning(t *testing.T) {
	manager, _ := newTestManager(t)
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	const operationID = 99

	firstGuard, alreadyErr, err := manager.Begin(BeginOperationJobInput{
		OperationID:             operationID,
		ConnectorRegistrationID: 321,
		ConnectorName:           "test",
		Kind:                    "pull",
	})
	if err != nil || alreadyErr != nil {
		t.Fatalf("first Begin failed: err=%v conflict=%v", err, alreadyErr)
	}
	t.Cleanup(func() {
		firstGuard.Release(JobOutcome{Status: sdkmodels.OperationJobStatusCancelled})
	})

	provider := &lockProbePullProvider{}
	operation := &db.Operation{
		Model:                   gorm.Model{ID: operationID},
		ConnectorRegistrationID: 321,
	}
	connectorsApp := &models.ConnectorsApp{JobManager: manager}

	app := fiber.New()
	app.Post("/operation/pull", func(c fiber.Ctx) error {
		c.Locals("operation", operation)
		c.Locals("connectorInfo", &models.ConnectorDetails{Name: "test"})
		return HandleOperationPull(c, provider, logger, &db.Database{}, connectorsApp)
	})

	req, err := http.NewRequest(http.MethodPost, "http://localhost/operation/pull", http.NoBody)
	if err != nil {
		t.Fatalf("failed to build request: %v", err)
	}

	resp, err := app.Test(req, fiber.TestConfig{Timeout: -1})
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusConflict {
		t.Fatalf("expected 409 conflict, got %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}
	if !strings.Contains(string(body), "already running") {
		t.Fatalf("expected canonical already-running message, got %q", body)
	}

	var payload sdkmodels.AlreadyRunningBody
	if unmarshalErr := json.Unmarshal(body, &payload); unmarshalErr != nil {
		t.Fatalf("failed to decode AlreadyRunningBody: %v (body=%q)", unmarshalErr, body)
	}
	if payload.JobID != firstGuard.JobID() {
		t.Fatalf(
			"409 body must surface the blocking job id; got %q, want %q",
			payload.JobID, firstGuard.JobID(),
		)
	}
	if payload.Kind != "pull" {
		t.Fatalf("409 body Kind = %q, want pull", payload.Kind)
	}
	if payload.OperationID != operationID {
		t.Fatalf("409 body OperationID = %d, want %d", payload.OperationID, operationID)
	}
	if provider.initializeCalled {
		t.Fatalf("expected pull provider not to initialize on lock conflict")
	}
}
