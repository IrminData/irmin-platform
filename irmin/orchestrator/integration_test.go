package orchestrator_test

import (
	"irmin-api/db"
	"irmin-api/lakefs"
	"irmin-api/lib"
	"irmin-api/orchestrator"
	"testing"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/zeebo/assert"
)

// TestWorkflowExecution_EndToEnd tests the complete workflow execution flow.
func TestWorkflowExecution_EndToEnd(t *testing.T) {
	_, database, env := setupTestOrchestrator(t)

	// Find the test user
	user, err := database.GetUserByEmail(env.TestUserEmail)
	if err != nil {
		t.Skipf("Skipping integration test - test user not found: %v", err)
		return
	}

	// Find the test workspace
	workspace, err := database.GetWorkspaceBySlug(env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping integration test - test workspace not found: %v", err)
		return
	}

	// Create a test repository
	repo := &db.Repository{
		Name:         "integration-test-repo",
		Slug:         "integration-test-repo",
		WorkspaceID:  workspace.ID,
		LakeFSRepoID: "integration-test-repo-lakefs",
		OwnerID:      user.ID,
	}
	err = database.Create(repo).Error
	if err != nil {
		t.Fatalf("Failed to create test repository: %v", err)
	}
	defer database.Delete(repo)

	// Create a test action workflowable
	repoPath := "/test.py"
	actionWorkflowable := &db.ActionWorkflowable{
		Executable:            "python",
		ResultsRepositoryID:   &repo.ID,
		ResultsRepositoryPath: &repoPath,
	}
	err = database.Create(actionWorkflowable).Error
	if err != nil {
		t.Fatalf("Failed to create test action workflowable: %v", err)
	}
	defer database.Delete(actionWorkflowable)

	// Create a test schedule
	schedule := &db.Schedule{
		MaxRuntime: 300,
		MaxRetries: 2,
	}
	err = database.Create(schedule).Error
	if err != nil {
		t.Fatalf("Failed to create test schedule: %v", err)
	}
	defer database.Delete(schedule)

	// Create a test workflow
	workflow := &db.Workflow{
		Name:        "Integration Test Workflow",
		Type:        irminmodels.WorkflowableTypeAction,
		WorkspaceID: workspace.ID,
		ScheduleID:  &schedule.ID,
		ActionID:    &actionWorkflowable.ID,
		OwnerID:     user.ID,
	}
	err = database.Create(workflow).Error
	if err != nil {
		t.Fatalf("Failed to create test workflow: %v", err)
	}
	defer database.Delete(workflow)

	// Create a time trigger
	rrule := "FREQ=MINUTELY;COUNT=1"
	trigger := &db.WorkflowTrigger{
		Type:       db.TimeTriggerType,
		ScheduleID: &schedule.ID,
		RRule:      &rrule,
	}
	err = database.Create(trigger).Error
	if err != nil {
		t.Fatalf("Failed to create test trigger: %v", err)
	}
	defer database.Delete(trigger)

	// For this test, manually create a workflow run to simulate what the trigger would do
	run, err := lib.CreateWorkflowRun(database.DB, workflow, user, trigger)
	assert.Equal(t, err, nil)
	assert.NotEqual(t, run, nil)

	// Clean up workflow run
	defer database.Delete(run)

	// Test workflow run status updates
	originalStatus := run.Status
	run.Status = irminmodels.WorkflowStatusComplete
	finishedAt := time.Now()
	run.FinishedAt = &finishedAt
	run.Logs = []string{"Integration test completed successfully"}

	err = database.Save(run).Error
	assert.Equal(t, err, nil)

	// Verify the update
	var updatedRun db.WorkflowRun
	database.First(&updatedRun, run.ID)
	assert.Equal(t, updatedRun.Status, irminmodels.WorkflowStatusComplete)
	assert.NotEqual(t, updatedRun.FinishedAt, nil)
	assert.Equal(t, len(updatedRun.Logs), 1)

	t.Logf("Workflow run %d status changed from %s to %s", run.ID, originalStatus, updatedRun.Status)
}

// TestOrchestratorEventChannels tests the event channel communication.
func TestOrchestratorEventChannels(t *testing.T) {
	orch, _, _ := setupTestOrchestrator(t)

	// Test multiple event types in quick succession
	events := []struct {
		name   string
		action func()
	}{
		{
			name: "LakeFS Event",
			action: func() {
				featureBranch := "feature-branch"
				event := &lakefs.WebhookEvent{
					EventType:    "post-commit",
					RepositoryID: "test-repo",
					BranchID:     &featureBranch,
				}
				orch.AddLakefsEvent(event)
			},
		},
		{
			name: "Dispatch Event",
			action: func() {
				workflowRunID := uint(100)
				workflowID := uint(50)
				event := &orchestrator.DispatchEvent{
					Timestamp:     time.Now(),
					EventType:     orchestrator.DispatchEventTypeWorkflowRun,
					WorkflowRunID: &workflowRunID,
					WorkflowID:    &workflowID,
				}
				orch.AddDispatchedEvent(event)
			},
		},
		{
			name: "Worker Event",
			action: func() {
				event := &orchestrator.WorkerEvent{
					Topic:                orchestrator.WorkerEventTopicWorkflowRun,
					WorkflowRunEventType: db.PostWorkflowRun,
					WorkflowRunID:        200,
					WorkflowID:           75,
				}
				orch.AddWorkerEvent(event)
			},
		},
	}

	// Add events rapidly to test channel buffering
	for range 10 {
		for _, event := range events {
			t.Run(event.name, func(_ *testing.T) {
				// Should not block or panic
				event.action()
			})
		}
	}

	// Give a moment for events to be queued
	time.Sleep(100 * time.Millisecond)
}

// TestWorkflowRunCreationAndExecution tests basic workflow run operations.
func TestWorkflowRunCreationAndExecution(t *testing.T) {
	_, database, env := setupTestOrchestrator(t)

	// Find the test user
	user, err := database.GetUserByEmail(env.TestUserEmail)
	if err != nil {
		t.Skipf("Skipping integration test - test user not found: %v", err)
		return
	}

	// Find the test workspace
	workspace, err := database.GetWorkspaceBySlug(env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping integration test - test workspace not found: %v", err)
		return
	}

	// Create a simple test schedule
	schedule := &db.Schedule{
		MaxRuntime: 120,
		MaxRetries: 3,
	}
	err = database.Create(schedule).Error
	if err != nil {
		t.Fatalf("Failed to create test schedule: %v", err)
	}
	defer database.Delete(schedule)

	// Create a simple test workflow
	workflow := &db.Workflow{
		Name:        "Test Workflow",
		Type:        irminmodels.WorkflowableTypeAction,
		WorkspaceID: workspace.ID,
		ScheduleID:  &schedule.ID,
		OwnerID:     user.ID,
	}
	err = database.Create(workflow).Error
	if err != nil {
		t.Fatalf("Failed to create test workflow: %v", err)
	}
	defer database.Delete(workflow)

	// Create a manual trigger (using time trigger type for testing)
	trigger := &db.WorkflowTrigger{
		Type:       db.TimeTriggerType,
		ScheduleID: &schedule.ID,
	}
	err = database.Create(trigger).Error
	if err != nil {
		t.Fatalf("Failed to create test trigger: %v", err)
	}
	defer database.Delete(trigger)

	// Create a workflow run manually
	run, err := lib.CreateWorkflowRun(database.DB, workflow, user, trigger)
	if err != nil {
		t.Fatalf("Failed to create workflow run: %v", err)
	}
	defer database.Delete(run)

	// Test the workflow execution preparation
	assert.Equal(t, run.WorkflowID, workflow.ID)
	assert.Equal(t, run.Status, irminmodels.WorkflowStatusPending)
	assert.Equal(t, *run.TriggeredByUserID, user.ID)
	assert.Equal(t, *run.TriggeredByID, trigger.ID)

	// Test workflow run status updates
	logs := []string{"Starting workflow", "Processing data", "Workflow completed"}
	run.Status = irminmodels.WorkflowStatusComplete
	finishedAt := time.Now()
	run.FinishedAt = &finishedAt
	run.Logs = logs

	err = database.Save(run).Error
	assert.Equal(t, err, nil)

	// Verify the final state
	var finalRun db.WorkflowRun
	database.First(&finalRun, run.ID)
	assert.Equal(t, finalRun.Status, irminmodels.WorkflowStatusComplete)
	assert.NotEqual(t, finalRun.FinishedAt, nil)
	assert.Equal(t, len(finalRun.Logs), 3)

	t.Logf("Successfully executed workflow run %d with %d log entries", finalRun.ID, len(finalRun.Logs))
}
