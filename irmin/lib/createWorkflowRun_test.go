package lib_test

import (
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/tests"
	"testing"

	"github.com/zeebo/assert"
)

func TestCreateWorkflowRun(t *testing.T) {
	env, d, initTestEnvErr := tests.InitTestEnv()
	if initTestEnvErr != nil {
		t.Fatalf("Failed to initialise test environment: %v", initTestEnvErr)
	}

	// Find the test user
	user, findUserErr := d.GetUserByEmail(env.TestUserEmail)
	if findUserErr != nil {
		t.Fatalf("Failed to get test user: %v", findUserErr)
	}

	// Find the test workspace
	workspace, findWorkspaceErr := d.GetWorkspaceBySlug(env.TestWorkspace)
	if findWorkspaceErr != nil {
		t.Fatalf("Failed to get test workspace: %v", findWorkspaceErr)
	}

	// Find a first workflow which has a schedule with more than 1 trigger
	var workflow db.Workflow
	if findWorkflowErr := d.
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
	if findTriggerErr := d.
		Where("workflow_triggers.deleted_at IS NULL").
		Where("workflow_triggers.schedule_id = ?", workflow.ScheduleID).
		First(&trigger).Error; findTriggerErr != nil {
		t.Fatalf("Failed to get test trigger: %v", findTriggerErr)
	}

	// Create a transaction
	tx := d.Begin()
	defer tx.Rollback()

	// Create a workflow run
	workflowRun, createWorkflowRunErr := lib.CreateWorkflowRun(tx, &workflow, user, &trigger)
	if createWorkflowRunErr != nil {
		t.Fatalf("Failed to create workflow run: %v", createWorkflowRunErr)
	}

	// Check the workflow run
	assert.Equal(t, workflowRun.WorkflowID, workflow.ID)
	assert.Equal(t, workflowRun.TriggeredByUserID, &user.ID)
	assert.Equal(t, workflowRun.TriggeredByID, &trigger.ID)
}
