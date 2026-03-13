package orchestrator_test

import (
	"context"
	"errors"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/lakefs"
	"irmin-api/lib"
	"irmin-api/orchestrator"
	"testing"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/zeebo/assert"
)

// TestRepositoryEventTrigger_PostCommit tests that a post-commit event triggers a workflow run.
func TestRepositoryEventTrigger_PostCommit(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Fatal("Test suite not initialized")
	}

	// Create data engine client
	ctx := context.Background()
	dataEngine, err := engine.NewClient(ctx, "en", ts.Logger, ts.Env, ts.DB)
	if err != nil {
		t.Fatalf("Failed to create data engine: %v", err)
	}

	// Create orchestrator
	orch := orchestrator.NewOrchestrator(ts.DB, ts.Logger, ts.Env, dataEngine, nil)

	// Start orchestrator in background to process events
	go func() {
		// Ignore context canceled error as it's expected during shutdown
		if orchErr := orch.StartOrchestrator(t.Context()); orchErr != nil && !errors.Is(orchErr, context.Canceled) {
			t.Logf("Orchestrator stopped with error: %v", orchErr)
		}
	}()

	// Find the test user
	user, err := ts.DB.GetUserByEmail(ts.Env.TestUserEmail)
	if err != nil {
		t.Skipf("Skipping test - test user not found: %v", err)
		return
	}

	// Find the test workspace
	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping test - test workspace not found: %v", err)
		return
	}

	// Create a test repository
	repo := &db.Repository{
		Name:         "event-trigger-test-repo",
		Slug:         "event-trigger-test-repo",
		WorkspaceID:  workspace.ID,
		LakeFSRepoID: "event-trigger-test-repo-lakefs",
		OwnerID:      user.ID,
	}
	err = ts.DB.Create(repo).Error
	if err != nil {
		t.Fatalf("Failed to create test repository: %v", err)
	}
	defer ts.DB.Delete(repo)

	// Create a test schedule
	schedule := &db.Schedule{
		MaxRuntime:  300,
		MaxRetries:  0,
		MinInterval: 0,
	}
	err = ts.DB.Create(schedule).Error
	if err != nil {
		t.Fatalf("Failed to create test schedule: %v", err)
	}
	defer ts.DB.Delete(schedule)

	// Create a test workflow
	workflow := &db.Workflow{
		Name:        "Repository Event Test Workflow",
		Type:        irminmodels.WorkflowableTypeAction,
		WorkspaceID: workspace.ID,
		ScheduleID:  &schedule.ID,
		OwnerID:     user.ID,
	}
	err = ts.DB.Create(workflow).Error
	if err != nil {
		t.Fatalf("Failed to create test workflow: %v", err)
	}
	defer ts.DB.Delete(workflow)

	// Create a repository event trigger for post-commit events
	postCommitEvent := lakefs.PostCommit
	trigger := &db.WorkflowTrigger{
		Type:            db.RepositoryTriggerType,
		ScheduleID:      &schedule.ID,
		RepositoryEvent: &postCommitEvent,
		RepositoryID:    &repo.ID,
	}
	err = ts.DB.Create(trigger).Error
	if err != nil {
		t.Fatalf("Failed to create test trigger: %v", err)
	}
	defer ts.DB.Delete(trigger)

	// Count existing workflow runs before the event
	var countBefore int64
	ts.DB.Model(&db.WorkflowRun{}).Where("workflow_id = ?", workflow.ID).Count(&countBefore)

	// Simulate a post-commit event from LakeFS
	branchID := "main"
	commitID := "abc123"
	commitMessage := "Test commit"
	event := &lakefs.WebhookEvent{
		EventType:     lakefs.PostCommit,
		EventTime:     time.Now(),
		RepositoryID:  repo.LakeFSRepoID,
		BranchID:      &branchID,
		CommitID:      &commitID,
		CommitMessage: &commitMessage,
	}

	// Add the event to the orchestrator
	orch.AddLakefsEvent(event)

	// Give the orchestrator time to process the event
	time.Sleep(500 * time.Millisecond)

	// Count workflow runs after the event
	var countAfter int64
	ts.DB.Model(&db.WorkflowRun{}).Where("workflow_id = ?", workflow.ID).Count(&countAfter)

	// Verify a new workflow run was created
	assert.Equal(t, countAfter, countBefore+1)

	// Clean up workflow runs
	ts.DB.Where("workflow_id = ?", workflow.ID).Delete(&db.WorkflowRun{})
}

// TestRepositoryEventTrigger_EventTypeMismatch tests that mismatched event types don't trigger.
func TestRepositoryEventTrigger_EventTypeMismatch(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Fatal("Test suite not initialized")
	}

	// Create data engine client
	ctx := context.Background()
	dataEngine, err := engine.NewClient(ctx, "en", ts.Logger, ts.Env, ts.DB)
	if err != nil {
		t.Fatalf("Failed to create data engine: %v", err)
	}

	// Create orchestrator
	orch := orchestrator.NewOrchestrator(ts.DB, ts.Logger, ts.Env, dataEngine, nil)

	// Start orchestrator in background to process events
	go func() {
		// Ignore context canceled error as it's expected during shutdown
		if orchErr := orch.StartOrchestrator(t.Context()); orchErr != nil && !errors.Is(orchErr, context.Canceled) {
			t.Logf("Orchestrator stopped with error: %v", orchErr)
		}
	}()

	// Find the test user
	user, err := ts.DB.GetUserByEmail(ts.Env.TestUserEmail)
	if err != nil {
		t.Skipf("Skipping test - test user not found: %v", err)
		return
	}

	// Find the test workspace
	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping test - test workspace not found: %v", err)
		return
	}

	// Create a test repository
	repo := &db.Repository{
		Name:         "event-mismatch-test-repo",
		Slug:         "event-mismatch-test-repo",
		WorkspaceID:  workspace.ID,
		LakeFSRepoID: "event-mismatch-test-repo-lakefs",
		OwnerID:      user.ID,
	}
	err = ts.DB.Create(repo).Error
	if err != nil {
		t.Fatalf("Failed to create test repository: %v", err)
	}
	defer ts.DB.Delete(repo)

	// Create a test schedule
	schedule := &db.Schedule{
		MaxRuntime:  300,
		MaxRetries:  0,
		MinInterval: 0,
	}
	err = ts.DB.Create(schedule).Error
	if err != nil {
		t.Fatalf("Failed to create test schedule: %v", err)
	}
	defer ts.DB.Delete(schedule)

	// Create a test workflow
	workflow := &db.Workflow{
		Name:        "Event Mismatch Test Workflow",
		Type:        irminmodels.WorkflowableTypeAction,
		WorkspaceID: workspace.ID,
		ScheduleID:  &schedule.ID,
		OwnerID:     user.ID,
	}
	err = ts.DB.Create(workflow).Error
	if err != nil {
		t.Fatalf("Failed to create test workflow: %v", err)
	}
	defer ts.DB.Delete(workflow)

	// Create a repository event trigger for post-merge events (NOT post-commit)
	postMergeEvent := lakefs.PostMerge
	trigger := &db.WorkflowTrigger{
		Type:            db.RepositoryTriggerType,
		ScheduleID:      &schedule.ID,
		RepositoryEvent: &postMergeEvent,
		RepositoryID:    &repo.ID,
	}
	err = ts.DB.Create(trigger).Error
	if err != nil {
		t.Fatalf("Failed to create test trigger: %v", err)
	}
	defer ts.DB.Delete(trigger)

	// Count existing workflow runs before the event
	var countBefore int64
	ts.DB.Model(&db.WorkflowRun{}).Where("workflow_id = ?", workflow.ID).Count(&countBefore)

	// Simulate a post-commit event (NOT post-merge)
	branchID := "main"
	event := &lakefs.WebhookEvent{
		EventType:    lakefs.PostCommit,
		EventTime:    time.Now(),
		RepositoryID: repo.LakeFSRepoID,
		BranchID:     &branchID,
	}

	// Add the event to the orchestrator
	orch.AddLakefsEvent(event)

	// Give the orchestrator time to process the event
	time.Sleep(500 * time.Millisecond)

	// Count workflow runs after the event
	var countAfter int64
	ts.DB.Model(&db.WorkflowRun{}).Where("workflow_id = ?", workflow.ID).Count(&countAfter)

	// Verify no new workflow run was created (event type mismatch)
	assert.Equal(t, countAfter, countBefore)

	// Clean up workflow runs
	ts.DB.Where("workflow_id = ?", workflow.ID).Delete(&db.WorkflowRun{})
}

// TestRepositoryEventTrigger_RefFilter tests that ref filtering works correctly.
func TestRepositoryEventTrigger_RefFilter(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Fatal("Test suite not initialized")
	}

	// Create data engine client
	ctx := context.Background()
	dataEngine, err := engine.NewClient(ctx, "en", ts.Logger, ts.Env, ts.DB)
	if err != nil {
		t.Fatalf("Failed to create data engine: %v", err)
	}

	// Create orchestrator
	orch := orchestrator.NewOrchestrator(ts.DB, ts.Logger, ts.Env, dataEngine, nil)

	// Start orchestrator in background to process events
	go func() {
		// Ignore context canceled error as it's expected during shutdown
		if orchErr := orch.StartOrchestrator(t.Context()); orchErr != nil && !errors.Is(orchErr, context.Canceled) {
			t.Logf("Orchestrator stopped with error: %v", orchErr)
		}
	}()

	// Find the test user
	user, err := ts.DB.GetUserByEmail(ts.Env.TestUserEmail)
	if err != nil {
		t.Skipf("Skipping test - test user not found: %v", err)
		return
	}

	// Find the test workspace
	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping test - test workspace not found: %v", err)
		return
	}

	// Create a test repository
	repo := &db.Repository{
		Name:         "ref-filter-test-repo",
		Slug:         "ref-filter-test-repo",
		WorkspaceID:  workspace.ID,
		LakeFSRepoID: "ref-filter-test-repo-lakefs",
		OwnerID:      user.ID,
	}
	err = ts.DB.Create(repo).Error
	if err != nil {
		t.Fatalf("Failed to create test repository: %v", err)
	}
	defer ts.DB.Delete(repo)

	// Create a test schedule
	schedule := &db.Schedule{
		MaxRuntime:  300,
		MaxRetries:  0,
		MinInterval: 0,
	}
	err = ts.DB.Create(schedule).Error
	if err != nil {
		t.Fatalf("Failed to create test schedule: %v", err)
	}
	defer ts.DB.Delete(schedule)

	// Create a test workflow
	workflow := &db.Workflow{
		Name:        "Ref Filter Test Workflow",
		Type:        irminmodels.WorkflowableTypeAction,
		WorkspaceID: workspace.ID,
		ScheduleID:  &schedule.ID,
		OwnerID:     user.ID,
	}
	err = ts.DB.Create(workflow).Error
	if err != nil {
		t.Fatalf("Failed to create test workflow: %v", err)
	}
	defer ts.DB.Delete(workflow)

	// Create a repository event trigger for main branch only
	postCommitEvent := lakefs.PostCommit
	mainBranch := "main"
	trigger := &db.WorkflowTrigger{
		Type:            db.RepositoryTriggerType,
		ScheduleID:      &schedule.ID,
		RepositoryEvent: &postCommitEvent,
		RepositoryID:    &repo.ID,
		RepositoryRef:   &mainBranch,
	}
	err = ts.DB.Create(trigger).Error
	if err != nil {
		t.Fatalf("Failed to create test trigger: %v", err)
	}
	defer ts.DB.Delete(trigger)

	// Count existing workflow runs before the event
	var countBefore int64
	ts.DB.Model(&db.WorkflowRun{}).Where("workflow_id = ?", workflow.ID).Count(&countBefore)

	// Test 1: Event on feature branch (should NOT trigger)
	featureBranch := "feature-branch"
	event1 := &lakefs.WebhookEvent{
		EventType:    lakefs.PostCommit,
		EventTime:    time.Now(),
		RepositoryID: repo.LakeFSRepoID,
		BranchID:     &featureBranch,
	}
	orch.AddLakefsEvent(event1)
	time.Sleep(500 * time.Millisecond)

	var countAfterFeature int64
	ts.DB.Model(&db.WorkflowRun{}).Where("workflow_id = ?", workflow.ID).Count(&countAfterFeature)
	assert.Equal(t, countAfterFeature, countBefore) // Should not have increased

	// Test 2: Event on main branch (should trigger)
	event2 := &lakefs.WebhookEvent{
		EventType:    lakefs.PostCommit,
		EventTime:    time.Now(),
		RepositoryID: repo.LakeFSRepoID,
		BranchID:     &mainBranch,
	}
	orch.AddLakefsEvent(event2)
	time.Sleep(500 * time.Millisecond)

	var countAfterMain int64
	ts.DB.Model(&db.WorkflowRun{}).Where("workflow_id = ?", workflow.ID).Count(&countAfterMain)
	assert.Equal(t, countAfterMain, countBefore+1) // Should have increased by 1

	// Clean up workflow runs
	ts.DB.Where("workflow_id = ?", workflow.ID).Delete(&db.WorkflowRun{})
}

// TestWorkflowRunEventTrigger_PreWorkflowRun tests that pre-workflow-run events trigger.
func TestWorkflowRunEventTrigger_PreWorkflowRun(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Fatal("Test suite not initialized")
	}

	// Create data engine client
	ctx := context.Background()
	dataEngine, err := engine.NewClient(ctx, "en", ts.Logger, ts.Env, ts.DB)
	if err != nil {
		t.Fatalf("Failed to create data engine: %v", err)
	}

	// Create orchestrator
	orch := orchestrator.NewOrchestrator(ts.DB, ts.Logger, ts.Env, dataEngine, nil)

	// Start orchestrator in background to process events
	go func() {
		// Ignore context canceled error as it's expected during shutdown
		if orchErr := orch.StartOrchestrator(t.Context()); orchErr != nil && !errors.Is(orchErr, context.Canceled) {
			t.Logf("Orchestrator stopped with error: %v", orchErr)
		}
	}()

	// Find the test user
	user, err := ts.DB.GetUserByEmail(ts.Env.TestUserEmail)
	if err != nil {
		t.Skipf("Skipping test - test user not found: %v", err)
		return
	}

	// Find the test workspace
	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping test - test workspace not found: %v", err)
		return
	}

	// Create a source workflow (the one being monitored)
	sourceSchedule := &db.Schedule{
		MaxRuntime: 300,
	}
	err = ts.DB.Create(sourceSchedule).Error
	if err != nil {
		t.Fatalf("Failed to create source schedule: %v", err)
	}
	defer ts.DB.Delete(sourceSchedule)

	sourceWorkflow := &db.Workflow{
		Name:        "Source Workflow",
		Type:        irminmodels.WorkflowableTypeAction,
		WorkspaceID: workspace.ID,
		ScheduleID:  &sourceSchedule.ID,
		OwnerID:     user.ID,
	}
	err = ts.DB.Create(sourceWorkflow).Error
	if err != nil {
		t.Fatalf("Failed to create source workflow: %v", err)
	}
	defer ts.DB.Delete(sourceWorkflow)

	// Create a target workflow (the one to be triggered)
	targetSchedule := &db.Schedule{
		MaxRuntime:  300,
		MinInterval: 0,
	}
	err = ts.DB.Create(targetSchedule).Error
	if err != nil {
		t.Fatalf("Failed to create target schedule: %v", err)
	}
	defer ts.DB.Delete(targetSchedule)

	targetWorkflow := &db.Workflow{
		Name:        "Target Workflow",
		Type:        irminmodels.WorkflowableTypeAction,
		WorkspaceID: workspace.ID,
		ScheduleID:  &targetSchedule.ID,
		OwnerID:     user.ID,
	}
	err = ts.DB.Create(targetWorkflow).Error
	if err != nil {
		t.Fatalf("Failed to create target workflow: %v", err)
	}
	defer ts.DB.Delete(targetWorkflow)

	// Create a workflow run event trigger
	preWorkflowRunEvent := db.PreWorkflowRun
	trigger := &db.WorkflowTrigger{
		Type:             db.WorkflowRunTriggerType,
		ScheduleID:       &targetSchedule.ID,
		WorkflowRunEvent: &preWorkflowRunEvent,
		WorkflowID:       &sourceWorkflow.ID,
	}
	err = ts.DB.Create(trigger).Error
	if err != nil {
		t.Fatalf("Failed to create test trigger: %v", err)
	}
	defer ts.DB.Delete(trigger)

	// Count existing workflow runs for target workflow
	var countBefore int64
	ts.DB.Model(&db.WorkflowRun{}).Where("workflow_id = ?", targetWorkflow.ID).Count(&countBefore)

	// Simulate a pre-workflow-run event
	event := &orchestrator.WorkerEvent{
		Topic:                orchestrator.WorkerEventTopicWorkflowRun,
		WorkflowRunEventType: db.PreWorkflowRun,
		WorkflowRunID:        1,
		WorkflowID:           sourceWorkflow.ID,
	}

	// Add the event to the orchestrator
	orch.AddWorkerEvent(event)

	// Give the orchestrator time to process the event
	time.Sleep(500 * time.Millisecond)

	// Count workflow runs after the event
	var countAfter int64
	ts.DB.Model(&db.WorkflowRun{}).Where("workflow_id = ?", targetWorkflow.ID).Count(&countAfter)

	// Verify a new workflow run was created
	assert.Equal(t, countAfter, countBefore+1)

	// Clean up workflow runs
	ts.DB.Where("workflow_id = ?", targetWorkflow.ID).Delete(&db.WorkflowRun{})
}

// TestWorkflowRunEventTrigger_PostWorkflowRun tests that post-workflow-run events trigger.
func TestWorkflowRunEventTrigger_PostWorkflowRun(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Fatal("Test suite not initialized")
	}

	// Create data engine client
	ctx := context.Background()
	dataEngine, err := engine.NewClient(ctx, "en", ts.Logger, ts.Env, ts.DB)
	if err != nil {
		t.Fatalf("Failed to create data engine: %v", err)
	}

	// Create orchestrator
	orch := orchestrator.NewOrchestrator(ts.DB, ts.Logger, ts.Env, dataEngine, nil)

	// Start orchestrator in background to process events
	go func() {
		// Ignore context canceled error as it's expected during shutdown
		if orchErr := orch.StartOrchestrator(t.Context()); orchErr != nil && !errors.Is(orchErr, context.Canceled) {
			t.Logf("Orchestrator stopped with error: %v", orchErr)
		}
	}()

	// Find the test user
	user, err := ts.DB.GetUserByEmail(ts.Env.TestUserEmail)
	if err != nil {
		t.Skipf("Skipping test - test user not found: %v", err)
		return
	}

	// Find the test workspace
	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping test - test workspace not found: %v", err)
		return
	}

	// Create a source workflow (the one being monitored)
	sourceSchedule := &db.Schedule{
		MaxRuntime: 300,
	}
	err = ts.DB.Create(sourceSchedule).Error
	if err != nil {
		t.Fatalf("Failed to create source schedule: %v", err)
	}
	defer ts.DB.Delete(sourceSchedule)

	sourceWorkflow := &db.Workflow{
		Name:        "Source Workflow Post",
		Type:        irminmodels.WorkflowableTypeAction,
		WorkspaceID: workspace.ID,
		ScheduleID:  &sourceSchedule.ID,
		OwnerID:     user.ID,
	}
	err = ts.DB.Create(sourceWorkflow).Error
	if err != nil {
		t.Fatalf("Failed to create source workflow: %v", err)
	}
	defer ts.DB.Delete(sourceWorkflow)

	// Create a target workflow (the one to be triggered)
	targetSchedule := &db.Schedule{
		MaxRuntime:  300,
		MinInterval: 0,
	}
	err = ts.DB.Create(targetSchedule).Error
	if err != nil {
		t.Fatalf("Failed to create target schedule: %v", err)
	}
	defer ts.DB.Delete(targetSchedule)

	targetWorkflow := &db.Workflow{
		Name:        "Target Workflow Post",
		Type:        irminmodels.WorkflowableTypeAction,
		WorkspaceID: workspace.ID,
		ScheduleID:  &targetSchedule.ID,
		OwnerID:     user.ID,
	}
	err = ts.DB.Create(targetWorkflow).Error
	if err != nil {
		t.Fatalf("Failed to create target workflow: %v", err)
	}
	defer ts.DB.Delete(targetWorkflow)

	// Create a workflow run event trigger for post-workflow-run
	postWorkflowRunEvent := db.PostWorkflowRun
	trigger := &db.WorkflowTrigger{
		Type:             db.WorkflowRunTriggerType,
		ScheduleID:       &targetSchedule.ID,
		WorkflowRunEvent: &postWorkflowRunEvent,
		WorkflowID:       &sourceWorkflow.ID,
	}
	err = ts.DB.Create(trigger).Error
	if err != nil {
		t.Fatalf("Failed to create test trigger: %v", err)
	}
	defer ts.DB.Delete(trigger)

	// Count existing workflow runs for target workflow
	var countBefore int64
	ts.DB.Model(&db.WorkflowRun{}).Where("workflow_id = ?", targetWorkflow.ID).Count(&countBefore)

	// Simulate a post-workflow-run event
	event := &orchestrator.WorkerEvent{
		Topic:                orchestrator.WorkerEventTopicWorkflowRun,
		WorkflowRunEventType: db.PostWorkflowRun,
		WorkflowRunID:        1,
		WorkflowID:           sourceWorkflow.ID,
	}

	// Add the event to the orchestrator
	orch.AddWorkerEvent(event)

	// Give the orchestrator time to process the event
	time.Sleep(500 * time.Millisecond)

	// Count workflow runs after the event
	var countAfter int64
	ts.DB.Model(&db.WorkflowRun{}).Where("workflow_id = ?", targetWorkflow.ID).Count(&countAfter)

	// Verify a new workflow run was created
	assert.Equal(t, countAfter, countBefore+1)

	// Clean up workflow runs
	ts.DB.Where("workflow_id = ?", targetWorkflow.ID).Delete(&db.WorkflowRun{})
}

// TestWorkflowRunEventTrigger_EventTypeMismatch tests that mismatched workflow run events don't trigger.
func TestWorkflowRunEventTrigger_EventTypeMismatch(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Fatal("Test suite not initialized")
	}

	// Create data engine client
	ctx := context.Background()
	dataEngine, err := engine.NewClient(ctx, "en", ts.Logger, ts.Env, ts.DB)
	if err != nil {
		t.Fatalf("Failed to create data engine: %v", err)
	}

	// Create orchestrator
	orch := orchestrator.NewOrchestrator(ts.DB, ts.Logger, ts.Env, dataEngine, nil)

	// Start orchestrator in background to process events
	go func() {
		// Ignore context canceled error as it's expected during shutdown
		if orchErr := orch.StartOrchestrator(t.Context()); orchErr != nil && !errors.Is(orchErr, context.Canceled) {
			t.Logf("Orchestrator stopped with error: %v", orchErr)
		}
	}()

	// Find the test user
	user, err := ts.DB.GetUserByEmail(ts.Env.TestUserEmail)
	if err != nil {
		t.Skipf("Skipping test - test user not found: %v", err)
		return
	}

	// Find the test workspace
	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping test - test workspace not found: %v", err)
		return
	}

	// Create a source workflow
	sourceSchedule := &db.Schedule{
		MaxRuntime: 300,
	}
	err = ts.DB.Create(sourceSchedule).Error
	if err != nil {
		t.Fatalf("Failed to create source schedule: %v", err)
	}
	defer ts.DB.Delete(sourceSchedule)

	sourceWorkflow := &db.Workflow{
		Name:        "Source Workflow Mismatch",
		Type:        irminmodels.WorkflowableTypeAction,
		WorkspaceID: workspace.ID,
		ScheduleID:  &sourceSchedule.ID,
		OwnerID:     user.ID,
	}
	err = ts.DB.Create(sourceWorkflow).Error
	if err != nil {
		t.Fatalf("Failed to create source workflow: %v", err)
	}
	defer ts.DB.Delete(sourceWorkflow)

	// Create a target workflow
	targetSchedule := &db.Schedule{
		MaxRuntime:  300,
		MinInterval: 0,
	}
	err = ts.DB.Create(targetSchedule).Error
	if err != nil {
		t.Fatalf("Failed to create target schedule: %v", err)
	}
	defer ts.DB.Delete(targetSchedule)

	targetWorkflow := &db.Workflow{
		Name:        "Target Workflow Mismatch",
		Type:        irminmodels.WorkflowableTypeAction,
		WorkspaceID: workspace.ID,
		ScheduleID:  &targetSchedule.ID,
		OwnerID:     user.ID,
	}
	err = ts.DB.Create(targetWorkflow).Error
	if err != nil {
		t.Fatalf("Failed to create target workflow: %v", err)
	}
	defer ts.DB.Delete(targetWorkflow)

	// Create a workflow run event trigger for POST-workflow-run
	postWorkflowRunEvent := db.PostWorkflowRun
	trigger := &db.WorkflowTrigger{
		Type:             db.WorkflowRunTriggerType,
		ScheduleID:       &targetSchedule.ID,
		WorkflowRunEvent: &postWorkflowRunEvent,
		WorkflowID:       &sourceWorkflow.ID,
	}
	err = ts.DB.Create(trigger).Error
	if err != nil {
		t.Fatalf("Failed to create test trigger: %v", err)
	}
	defer ts.DB.Delete(trigger)

	// Count existing workflow runs for target workflow
	var countBefore int64
	ts.DB.Model(&db.WorkflowRun{}).Where("workflow_id = ?", targetWorkflow.ID).Count(&countBefore)

	// Simulate a PRE-workflow-run event (NOT post - should NOT trigger)
	event := &orchestrator.WorkerEvent{
		Topic:                orchestrator.WorkerEventTopicWorkflowRun,
		WorkflowRunEventType: db.PreWorkflowRun,
		WorkflowRunID:        1,
		WorkflowID:           sourceWorkflow.ID,
	}

	// Add the event to the orchestrator
	orch.AddWorkerEvent(event)

	// Give the orchestrator time to process the event
	time.Sleep(500 * time.Millisecond)

	// Count workflow runs after the event
	var countAfter int64
	ts.DB.Model(&db.WorkflowRun{}).Where("workflow_id = ?", targetWorkflow.ID).Count(&countAfter)

	// Verify no new workflow run was created (event type mismatch)
	assert.Equal(t, countAfter, countBefore)

	// Clean up workflow runs
	ts.DB.Where("workflow_id = ?", targetWorkflow.ID).Delete(&db.WorkflowRun{})
}

// TestWorkflowStartLog_RepositoryEventTrigger tests that workflow start logs include repository event details.
func TestWorkflowStartLog_RepositoryEventTrigger(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Fatal("Test suite not initialized")
	}

	// Find the test user
	user, err := ts.DB.GetUserByEmail(ts.Env.TestUserEmail)
	if err != nil {
		t.Skipf("Skipping test - test user not found: %v", err)
		return
	}

	// Find the test workspace
	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping test - test workspace not found: %v", err)
		return
	}

	// Create a test repository
	repo := &db.Repository{
		Name:         "log-test-repo",
		Slug:         "log-test-repo",
		WorkspaceID:  workspace.ID,
		LakeFSRepoID: "log-test-repo-lakefs",
		OwnerID:      user.ID,
	}
	err = ts.DB.Create(repo).Error
	if err != nil {
		t.Fatalf("Failed to create test repository: %v", err)
	}
	defer ts.DB.Delete(repo)

	// Create a test schedule
	schedule := &db.Schedule{
		MaxRuntime:  300,
		MinInterval: 0,
	}
	err = ts.DB.Create(schedule).Error
	if err != nil {
		t.Fatalf("Failed to create test schedule: %v", err)
	}
	defer ts.DB.Delete(schedule)

	// Create a test workflow
	workflow := &db.Workflow{
		Name:        "Log Test Workflow",
		Type:        irminmodels.WorkflowableTypeAction,
		WorkspaceID: workspace.ID,
		ScheduleID:  &schedule.ID,
		OwnerID:     user.ID,
	}
	err = ts.DB.Create(workflow).Error
	if err != nil {
		t.Fatalf("Failed to create test workflow: %v", err)
	}
	defer ts.DB.Delete(workflow)

	// Create a repository event trigger
	postCommitEvent := lakefs.PostCommit
	mainBranch := "main"
	trigger := &db.WorkflowTrigger{
		Type:            db.RepositoryTriggerType,
		ScheduleID:      &schedule.ID,
		RepositoryEvent: &postCommitEvent,
		RepositoryID:    &repo.ID,
		RepositoryRef:   &mainBranch,
	}
	err = ts.DB.Create(trigger).Error
	if err != nil {
		t.Fatalf("Failed to create test trigger: %v", err)
	}
	defer ts.DB.Delete(trigger)

	// Create a workflow run with this trigger
	run, err := lib.CreateWorkflowRun(ts.DB.DB, workflow, nil, trigger, nil)
	if err != nil {
		t.Fatalf("Failed to create workflow run: %v", err)
	}
	defer ts.DB.Delete(run)

	// Verify trigger details are properly loaded
	assert.NotEqual(t, run.TriggeredBy, nil)
	assert.Equal(t, run.TriggeredBy.Type, db.RepositoryTriggerType)
	assert.NotEqual(t, run.TriggeredBy.Repository, nil)
	assert.Equal(t, run.TriggeredBy.Repository.Slug, "log-test-repo")
}

// TestWorkflowStartLog_WorkflowRunEventTrigger tests workflow start logs include workflow run event details.
func TestWorkflowStartLog_WorkflowRunEventTrigger(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Fatal("Test suite not initialized")
	}

	// Find the test user
	user, err := ts.DB.GetUserByEmail(ts.Env.TestUserEmail)
	if err != nil {
		t.Skipf("Skipping test - test user not found: %v", err)
		return
	}

	// Find the test workspace
	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Skipf("Skipping test - test workspace not found: %v", err)
		return
	}

	// Create a source workflow
	sourceSchedule := &db.Schedule{
		MaxRuntime: 300,
	}
	err = ts.DB.Create(sourceSchedule).Error
	if err != nil {
		t.Fatalf("Failed to create source schedule: %v", err)
	}
	defer ts.DB.Delete(sourceSchedule)

	sourceWorkflow := &db.Workflow{
		Name:        "Log Source Workflow",
		Type:        irminmodels.WorkflowableTypeAction,
		WorkspaceID: workspace.ID,
		ScheduleID:  &sourceSchedule.ID,
		OwnerID:     user.ID,
	}
	err = ts.DB.Create(sourceWorkflow).Error
	if err != nil {
		t.Fatalf("Failed to create source workflow: %v", err)
	}
	defer ts.DB.Delete(sourceWorkflow)

	// Create a target workflow
	targetSchedule := &db.Schedule{
		MaxRuntime:  300,
		MinInterval: 0,
	}
	err = ts.DB.Create(targetSchedule).Error
	if err != nil {
		t.Fatalf("Failed to create target schedule: %v", err)
	}
	defer ts.DB.Delete(targetSchedule)

	targetWorkflow := &db.Workflow{
		Name:        "Log Target Workflow",
		Type:        irminmodels.WorkflowableTypeAction,
		WorkspaceID: workspace.ID,
		ScheduleID:  &targetSchedule.ID,
		OwnerID:     user.ID,
	}
	err = ts.DB.Create(targetWorkflow).Error
	if err != nil {
		t.Fatalf("Failed to create target workflow: %v", err)
	}
	defer ts.DB.Delete(targetWorkflow)

	// Create a workflow run event trigger
	postWorkflowRunEvent := db.PostWorkflowRun
	trigger := &db.WorkflowTrigger{
		Type:             db.WorkflowRunTriggerType,
		ScheduleID:       &targetSchedule.ID,
		WorkflowRunEvent: &postWorkflowRunEvent,
		WorkflowID:       &sourceWorkflow.ID,
	}
	err = ts.DB.Create(trigger).Error
	if err != nil {
		t.Fatalf("Failed to create test trigger: %v", err)
	}
	defer ts.DB.Delete(trigger)

	// Create a workflow run with this trigger
	run, err := lib.CreateWorkflowRun(ts.DB.DB, targetWorkflow, nil, trigger, nil)
	if err != nil {
		t.Fatalf("Failed to create workflow run: %v", err)
	}
	defer ts.DB.Delete(run)

	// Verify trigger details are properly loaded
	assert.NotEqual(t, run.TriggeredBy, nil)
	assert.Equal(t, run.TriggeredBy.Type, db.WorkflowRunTriggerType)
	assert.NotEqual(t, run.TriggeredBy.Workflow, nil)
	assert.Equal(t, run.TriggeredBy.Workflow.Name, "Log Source Workflow")
}
