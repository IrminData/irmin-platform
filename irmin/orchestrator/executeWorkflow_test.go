package orchestrator_test

import (
	"irmin-api/db"
	"testing"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/zeebo/assert"
)

func TestExecuteWorkflow_NilInputs(t *testing.T) {
	orch, _, _ := setupTestOrchestrator(t)

	ctx := t.Context()

	// Test with nil workflow
	result, err := orch.ExecuteWorkflow(ctx, nil, &db.WorkflowRun{})
	assert.NotEqual(t, err, nil)
	assert.Equal(t, result, (*db.WorkflowRun)(nil))
	assert.Equal(t, err.Error(), "workflow or run is nil")

	// Test with nil run
	result, err = orch.ExecuteWorkflow(ctx, &db.Workflow{}, nil)
	assert.NotEqual(t, err, nil)
	assert.Equal(t, result, (*db.WorkflowRun)(nil))
	assert.Equal(t, err.Error(), "workflow or run is nil")
}

func TestWorkflowRunStatusUpdate(t *testing.T) {
	_, database, _ := setupTestOrchestrator(t)

	// Create a test workflow run
	now := time.Now()
	run := &db.WorkflowRun{
		WorkflowID: 1,
		Status:     irminmodels.WorkflowStatusRunning,
		StartedAt:  &now,
	}
	err := database.Create(run).Error
	if err != nil {
		t.Fatalf("Failed to create test workflow run: %v", err)
	}
	defer database.Delete(run)

	// Test updating status directly
	run.Status = irminmodels.WorkflowStatusComplete
	finishedAt := time.Now()
	run.FinishedAt = &finishedAt
	run.Logs = []string{"Step 1 completed", "Step 2 completed"}

	err = database.Save(run).Error
	assert.Equal(t, err, nil)

	// Verify the update
	var updatedRun db.WorkflowRun
	database.First(&updatedRun, run.ID)
	assert.Equal(t, updatedRun.Status, irminmodels.WorkflowStatusComplete)
	assert.NotEqual(t, updatedRun.FinishedAt, nil)
	assert.Equal(t, len(updatedRun.Logs), 2)
}

func TestWorkflowRunErrorStatus(t *testing.T) {
	_, database, _ := setupTestOrchestrator(t)

	// Create a test workflow run
	now := time.Now()
	run := &db.WorkflowRun{
		WorkflowID: 1,
		Status:     irminmodels.WorkflowStatusRunning,
		StartedAt:  &now,
	}
	err := database.Create(run).Error
	if err != nil {
		t.Fatalf("Failed to create test workflow run: %v", err)
	}
	defer database.Delete(run)

	// Test updating to error status
	run.Status = irminmodels.WorkflowStatusError
	finishedAt := time.Now()
	run.FinishedAt = &finishedAt
	run.Logs = []string{"Step 1 failed", "Retrying...", "Step 1 failed again"}

	err = database.Save(run).Error
	assert.Equal(t, err, nil)

	// Verify the update
	var updatedRun db.WorkflowRun
	database.First(&updatedRun, run.ID)
	assert.Equal(t, updatedRun.Status, irminmodels.WorkflowStatusError)
	assert.NotEqual(t, updatedRun.FinishedAt, nil)
	assert.Equal(t, len(updatedRun.Logs), 3)
}
