package lib_test

import (
	"irmin-api/db"
	"irmin-api/lib"
	"testing"

	"github.com/zeebo/assert"
)

func TestCreateWorkflowRun(t *testing.T) {
	ts := lib.GetTestSuite()

	// Skip if test data is not available
	user, workspace := lib.SkipIfNoTestData(t, ts.DB, ts.Env.TestUserEmail, ts.Env.TestWorkspace)

	// Find a first workflow which has a schedule with more than 1 trigger
	var workflow db.Workflow
	if findWorkflowErr := ts.DB.
		Joins("JOIN schedules ON workflows.schedule_id = schedules.id").
		Joins("JOIN workflow_triggers ON workflow_triggers.schedule_id = schedules.id").
		Where("workflows.deleted_at IS NULL").
		Where("workflows.workspace_id = ?", workspace.ID).
		Where("workflows.schedule_id IS NOT NULL").
		Where("workflow_triggers.deleted_at IS NULL").
		First(&workflow).Error; findWorkflowErr != nil {
		t.Fatalf("Failed to get test workflow: %v", findWorkflowErr)
	}

	// Find the first trigger for the workflow
	var trigger db.WorkflowTrigger
	if findTriggerErr := ts.DB.
		Where("workflow_triggers.deleted_at IS NULL").
		Where("workflow_triggers.schedule_id = ?", workflow.ScheduleID).
		First(&trigger).Error; findTriggerErr != nil {
		t.Fatalf("Failed to get test trigger: %v", findTriggerErr)
	}

	// Create a transaction
	tx := ts.DB.Begin()
	defer tx.Rollback()

	// Create a workflow run
	workflowRun, createWorkflowRunErr := lib.CreateWorkflowRun(tx, &workflow, user, &trigger, nil, false)
	if createWorkflowRunErr != nil {
		t.Fatalf("Failed to create workflow run: %v", createWorkflowRunErr)
	}

	// Check the workflow run
	assert.Equal(t, workflowRun.WorkflowID, workflow.ID)
	assert.Equal(t, workflowRun.TriggeredByUserID, &user.ID)
	assert.Equal(t, workflowRun.TriggeredByID, &trigger.ID)
}
