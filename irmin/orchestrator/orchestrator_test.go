package orchestrator_test

import (
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/lakefs"
	"irmin-api/lib"
	"irmin-api/orchestrator"
	"irmin-api/utils"
	"testing"
	"time"

	"github.com/zeebo/assert"
)

func setupTestOrchestrator(t *testing.T) (*orchestrator.Orchestrator, *db.Database, *utils.CoreAPIEnv) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Fatal("Test suite not initialized")
	}

	// Create data engine client
	ctx := t.Context()
	dataEngine, err := engine.NewClient(ctx, ts.Logger, ts.Env, ts.DB)
	if err != nil {
		t.Fatalf("Failed to create data engine: %v", err)
	}

	// Create orchestrator
	orch := orchestrator.NewOrchestrator(ts.DB, ts.Logger, ts.Env, dataEngine, nil)

	return orch, ts.DB, ts.Env
}

func TestNewOrchestrator(t *testing.T) {
	orch, _, _ := setupTestOrchestrator(t)
	assert.NotEqual(t, orch, nil)
}

func TestAddLakefsEvent(t *testing.T) {
	orch, _, _ := setupTestOrchestrator(t)

	branchID := "main"
	event := &lakefs.WebhookEvent{
		EventType:    "pre-commit",
		RepositoryID: "test-repo",
		BranchID:     &branchID,
	}

	// Add event - should not block or panic
	orch.AddLakefsEvent(event)
}

func TestAddDispatchedEvent(t *testing.T) {
	orch, _, _ := setupTestOrchestrator(t)

	workflowRunID := uint(1)
	workflowID := uint(1)
	event := &orchestrator.DispatchEvent{
		Timestamp:     time.Now(),
		EventType:     orchestrator.DispatchEventTypeWorkflowRun,
		WorkflowRunID: &workflowRunID,
		WorkflowID:    &workflowID,
	}

	// Add event - should not block or panic
	orch.AddDispatchedEvent(event)
}

func TestAddWorkerEvent(t *testing.T) {
	orch, _, _ := setupTestOrchestrator(t)

	event := &orchestrator.WorkerEvent{
		Topic:                orchestrator.WorkerEventTopicWorkflowRun,
		WorkflowRunEventType: db.PreWorkflowRun,
		WorkflowRunID:        1,
		WorkflowID:           1,
	}

	// Add event - should not block or panic
	orch.AddWorkerEvent(event)
}
