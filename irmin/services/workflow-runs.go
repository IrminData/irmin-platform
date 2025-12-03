package services

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/permissions"
	"slices"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

func (api *APIServices) CreateWorkflowRun(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	workflow *db.Workflow,
) (*db.WorkflowRun, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceWorkflowRun,
		&workflow.ID,
		db.PolicyActionCreate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to create workflow run",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"workflow",
			workflow.Name,
		)
		return nil, ErrAccessDenied
	}

	// Create a new workflow run.
	var run *db.WorkflowRun
	transactionErr := api.DB.WithContext(c).Transaction(func(tx *gorm.DB) error {
		var createWorkflowRunErr error
		run, createWorkflowRunErr = lib.CreateWorkflowRun(tx, workflow, user, nil)
		if createWorkflowRunErr != nil {
			return createWorkflowRunErr
		}
		return nil
	})
	if transactionErr != nil {
		api.Logger.ErrorContext(c, "Error creating workflow run", "error", transactionErr, "workflow_id", workflow.ID)
		return nil, transactionErr
	}

	// We don't need to actually execute the workflow here, as the orchestrator will do that.

	// Contstruct the sqid for the workflow run.
	runSqid, runSqidErr := api.SQIDManager.Encode("workflow-runs", uint64(run.ID))
	if runSqidErr != nil {
		api.Logger.ErrorContext(c, "Error encoding workflow run sqid", "error", runSqidErr)
		return nil, runSqidErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Workflow run %s created", runSqid),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the workflow run.
	return run, nil
}

func (api *APIServices) GetWorkflowRun(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	workflow *db.Workflow,
	runSqid string,
) (*db.WorkflowRun, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceWorkflowRun,
		&workflow.ID,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to get workflow run",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"workflow",
			workflow.Name,
		)
		return nil, ErrAccessDenied
	}

	// Decode the workflow run ID.
	workflowRunID, decodeSqidErr := api.SQIDManager.Decode("workflow-runs", runSqid)
	if decodeSqidErr != nil {
		api.Logger.ErrorContext(c, "Error decoding workflow run sqid", "error", decodeSqidErr)
		return nil, decodeSqidErr
	}

	// Find the workflow run by its ID.
	workflowRun, getWorkflowRunErr := api.DB.GetWorkflowRunByID(uint(workflowRunID))
	if getWorkflowRunErr != nil {
		api.Logger.ErrorContext(c, "Error retrieving workflow run", "error", getWorkflowRunErr)
		return nil, getWorkflowRunErr
	}

	// Make sure the workflow run belongs to the workflow.
	if workflowRun.WorkflowID != workflow.ID {
		api.Logger.ErrorContext(c, "Workflow run does not belong to workflow")
		return nil, ErrAccessDenied
	}

	// Return the workflow run.
	return workflowRun, nil
}

func (api *APIServices) ListWorkflowRuns(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	workflow *db.Workflow,
	perPage, offset int,
) ([]db.WorkflowRun, int, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceWorkflowRun,
		&workflow.ID,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, 0, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to list workflow runs",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"workflow",
			workflow.Name,
		)
		return nil, 0, ErrAccessDenied
	}

	// Get the workflow runs for the workflow.
	runs, count, getWorkflowRunsErr := api.DB.GetWorkflowRunsByWorkflowID(
		workflow.ID,
		perPage,
		offset,
	)
	if getWorkflowRunsErr != nil {
		api.Logger.ErrorContext(c, "error getting workflow runs", "error", getWorkflowRunsErr)
		return nil, 0, getWorkflowRunsErr
	}

	// Return the workflow runs.
	return runs, count, nil
}

func (api *APIServices) CancelWorkflowRun(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	workflow *db.Workflow,
	runSqid string,
) (*db.WorkflowRun, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceWorkflowRun,
		&workflow.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to cancel workflow run",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"workflow",
			workflow.Name,
		)
		return nil, ErrAccessDenied
	}

	// Make sure a run sqid is provided.
	if runSqid == "" {
		api.Logger.ErrorContext(c, "No workflow run selected")
		return nil, ErrAccessDenied
	}

	// Decode the workflow run ID.
	workflowRunID, decodeSqidErr := api.SQIDManager.Decode("workflow-runs", runSqid)
	if decodeSqidErr != nil {
		api.Logger.ErrorContext(c, "Error decoding workflow run sqid", "error", decodeSqidErr)
		return nil, decodeSqidErr
	}

	// Find the workflow run by its ID.
	workflowRun, getWorkflowRunErr := api.DB.GetWorkflowRunByID(uint(workflowRunID))
	if getWorkflowRunErr != nil {
		api.Logger.ErrorContext(c, "Error retrieving workflow run", "error", getWorkflowRunErr)
		return nil, getWorkflowRunErr
	}

	// Make sure the workflow run belongs to the workflow.
	if workflowRun.WorkflowID != workflow.ID {
		api.Logger.ErrorContext(c, "Workflow run does not belong to workflow")
		return nil, ErrAccessDenied
	}

	// Check if the workflow run is in a cancellable state
	// Users can cancel workflows that are:
	// - Pending: waiting to be dispatched
	// - Initiating: being set up
	// - Running: actively executing
	cancellableStatuses := []irminmodels.WorkflowStatus{
		irminmodels.WorkflowStatusPending,
		irminmodels.WorkflowStatusInitiating,
		irminmodels.WorkflowStatusRunning,
	}

	if !slices.Contains(cancellableStatuses, workflowRun.Status) {
		api.Logger.ErrorContext(c, "Workflow run is not in a cancellable state",
			"status", workflowRun.Status,
			"run_id", workflowRun.ID)
		return nil, fmt.Errorf("workflow run cannot be cancelled (status: %s)", workflowRun.Status)
	}

	// Update the database status to cancelled
	// This will trigger a PostgreSQL notification that the orchestrator listens to
	// The orchestrator will then cancel the running workflow (even on other server instances)
	workflowRun.Status = irminmodels.WorkflowStatusCancelled
	finishedAt := time.Now()
	workflowRun.FinishedAt = &finishedAt
	if saveErr := api.DB.Save(&workflowRun).Error; saveErr != nil {
		api.Logger.ErrorContext(c, "Error updating workflow run status to cancelled", "error", saveErr)
		return nil, saveErr
	}

	api.Logger.InfoContext(c, "workflow run status updated to cancelled, orchestrator will handle cancellation",
		"run_id", workflowRun.ID)

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeWarning,
		Description: fmt.Sprintf("Workflow run %s cancelled", runSqid),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the workflow run.
	return workflowRun, nil
}

func (api *APIServices) ListAllWorkflowRuns(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	perPage, offset int,
) ([]db.WorkflowRun, int, error) {
	// Get all workflow runs for the workspace
	runs, count, getWorkflowRunsErr := api.DB.GetWorkflowRunsByWorkspaceID(
		workspace.ID,
		perPage,
		offset,
	)
	if getWorkflowRunsErr != nil {
		api.Logger.ErrorContext(c, "error getting workflow runs", "error", getWorkflowRunsErr)
		return nil, 0, getWorkflowRunsErr
	}

	// Filter workflow runs based on user permissions for the associated workflows
	filteredRuns, err := permissions.IsAllowedFilter(
		api.PermissionService,
		user,
		workspace,
		db.PolicyResourceWorkflowRun,
		db.PolicyActionRead,
		runs,
		func(run db.WorkflowRun) uint { return run.WorkflowID },
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error filtering workflow runs by permissions", "error", err)
		return nil, 0, err
	}

	// Return the filtered workflow runs
	return filteredRuns, count, nil
}
