package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/permissions"
	"slices"
	"strings"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

//nolint:gochecknoglobals // Package-level variable needed for safe pointer storage
var (
	// defaultValidationMode is the default validation mode for pipeline validation stages.
	// This must be a package-level variable so we can safely store its pointer.
	defaultValidationMode = "all"
	// defaultTransformMode is the default transform mode for pipeline transform stages.
	// This must be a package-level variable so we can safely store its pointer.
	defaultTransformMode = "all"
)

const (
	// Mode constants for pipeline stages
	modeSingle = "single"
	modeAll    = "all"
)

// GetWorkflow gets a workflow by its SQID.
//
//nolint:dupl // Each resource type needs its own service method following similar patterns.
func (api *APIServices) GetWorkflow(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	workflowSqid string,
) (*db.Workflow, error) {
	// Decode the ID
	workflowID, err := api.SQIDManager.Decode("workflows", workflowSqid)
	if err != nil {
		api.Logger.ErrorContext(c, "Error decoding workflow SQID", "error", err)
		return nil, NewInternalErrorf("error decoding workflow SQID: %w", err)
	}

	// Make sure this is allowed
	resourceID := uint(workflowID)
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceWorkflow,
		&resourceID,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		return nil, ErrAccessDenied
	}

	// Get the workflow
	workflow, err := api.DB.GetWorkflowByID(uint(workflowID))
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting workflow", "error", err)
		return nil, NewInternalErrorf("error getting workflow: %w", err)
	}

	return workflow, nil
}

func (api *APIServices) ListWorkflows(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	workflowType string,
) ([]db.Workflow, error) {
	var workflows []db.Workflow
	var err error

	if workflowType != "" {
		// Get the workflows for the workspace filtered by type
		workflows, err = api.DB.GetWorkflowsOfTypeByWorkspaceID(
			workspace.ID,
			irminmodels.WorkflowableType(workflowType),
		)
	} else {
		// Get all workflows for the workspace
		workflows, err = api.DB.GetWorkflowsByWorkspaceID(workspace.ID)
	}

	if err != nil {
		api.Logger.ErrorContext(c, "Error retrieving workflows", "error", err)
		return nil, NewInternalErrorf("error retrieving workflows: %w", err)
	}

	// Filter workflows based on user permissions
	filteredWorkflows, err := permissions.IsAllowedFilter(
		api.PermissionService,
		user,
		workspace,
		db.PolicyResourceWorkflow,
		db.PolicyActionRead,
		workflows,
		func(w db.Workflow) uint { return w.ID },
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error filtering workflows by permissions", "error", err)
		return nil, NewInternalErrorf("error filtering workflows by permissions: %w", err)
	}

	return filteredWorkflows, nil
}

func (api *APIServices) UpdateWorkflow(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	workflow *db.Workflow,
	req irmincore.UpdateWorkflowRequest,
) (*db.Workflow, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceWorkflow,
		&workflow.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to update workflow",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"workflow",
			workflow.Name,
		)
		return nil, ErrAccessDenied
	}

	// Update workflow fields
	applyOptionalField(&workflow.Name, req.Name)
	applyNullableField(&workflow.Description, req.Description)
	applyNullableField(&workflow.Documentation, req.Documentation)

	// Save the workflow
	if saveErr := api.DB.Save(workflow).Error; saveErr != nil {
		api.Logger.ErrorContext(c, "Error updating workflow", "error", saveErr, "workflow_id", workflow.ID)
		return nil, NewInternalErrorf("error updating workflow: %w", saveErr)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Workflow %s settings updated", workflow.Name),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return formatted workflow
	return workflow, nil
}

func (api *APIServices) CreateWorkflow(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	req irmincore.WorkflowRequest,
) (*db.Workflow, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceWorkflow,
		nil,
		db.PolicyActionCreate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to create workflow",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
		)
		return nil, ErrAccessDenied
	}

	// Parse and validate schedule BEFORE starting transaction to avoid deadlocks
	schedule, parseScheduleErr := lib.ParseScheduleFromData(&req.Schedule, api.DB, *workspace, api.SQIDManager)
	if parseScheduleErr != nil {
		api.Logger.ErrorContext(c, "Error parsing schedule", "error", parseScheduleErr)
		return nil, NewInternalErrorf("error parsing schedule: %w", parseScheduleErr)
	}

	// Create variables to store all possible workflowable objects.
	var importWorkflowable *db.ImportWorkflowable
	var exportWorkflowable *db.ExportWorkflowable
	var actionWorkflowable *db.ActionWorkflowable
	var pipelineWorkflowable *db.PipelineWorkflowable
	var workflow db.Workflow

	// Start a transaction for all database operations
	txErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Wrap tx in a Database struct so all DB operations use the transaction
		txDB := &db.Database{DB: tx}

		// Create workflowable based on type
		var createWorkflowableErr error
		importWorkflowable, exportWorkflowable, actionWorkflowable, pipelineWorkflowable, createWorkflowableErr = api.createWorkflowableByType(
			txDB,
			workspace,
			&req,
			0, // Pass 0 for new workflows (ID not yet assigned)
		)
		if createWorkflowableErr != nil {
			return NewInternalErrorf("error creating workflowable: %w", createWorkflowableErr)
		}

		// Create schedule
		if createScheduleErr := api.createWorkflowSchedule(tx, schedule); createScheduleErr != nil {
			return NewInternalErrorf("error creating workflow schedule: %w", createScheduleErr)
		}

		// Create workflow record
		workflow = api.createWorkflowRecord(
			&req,
			user,
			workspace,
			schedule,
			importWorkflowable,
			exportWorkflowable,
			actionWorkflowable,
			pipelineWorkflowable,
		)
		if createWorkflowErr := tx.Create(&workflow).Error; createWorkflowErr != nil {
			return NewInternalErrorf("error creating workflow: %w", createWorkflowErr)
		}

		// Add tags
		if addTagsErr := api.addWorkflowTags(tx, &workflow, req.Tags, workspace.ID); addTagsErr != nil {
			return NewInternalErrorf("error adding workflow tags: %w", addTagsErr)
		}

		// Fetch the full workflow object with all relations
		return tx.Preload("Owner").
			Preload("Schedule").
			Preload("Import").
			Preload("Export").
			Preload("Action").
			Preload("Pipeline.Stages").
			Preload("Tags").
			First(&workflow, workflow.ID).
			Error
	})

	if txErr != nil {
		api.Logger.ErrorContext(c, "Error creating workflow", "error", txErr)
		return nil, NewInternalErrorf("error in database transaction: %w", txErr)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: "Workflow created",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the workflow
	return &workflow, nil
}

func (api *APIServices) UpdateWorkflowable(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	workflow *db.Workflow,
	workflowableReq irminmodels.Workflowable,
) (*db.Workflow, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceWorkflow,
		&workflow.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to update workflow",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"workflow",
			workflow.Name,
		)
		return nil, ErrAccessDenied
	}

	// Create variables to store all possible workflowable objects.
	var importWorkflowable *db.ImportWorkflowable
	var exportWorkflowable *db.ExportWorkflowable
	var actionWorkflowable *db.ActionWorkflowable
	var pipelineWorkflowable *db.PipelineWorkflowable

	// Start a transaction for all database operations
	txErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Wrap tx in a Database struct so all DB operations use the transaction
		txDB := &db.Database{DB: tx}

		// Make sure the workflowable type is unchanged
		if workflowableReq.Type != workflow.Type {
			return errors.New("workflowable type cannot be changed")
		}

		// Create new workflowable based on type
		var createWorkflowableErr error
		switch workflowableReq.Type {
		case irminmodels.WorkflowableTypeImport:
			importWorkflowable, _, createWorkflowableErr = api.createImportExportWorkflowable(
				txDB,
				workspace,
				&workflowableReq,
				irminmodels.WorkflowableTypeImport,
			)
		case irminmodels.WorkflowableTypeExport:
			_, exportWorkflowable, createWorkflowableErr = api.createImportExportWorkflowable(
				txDB,
				workspace,
				&workflowableReq,
				irminmodels.WorkflowableTypeExport,
			)
		case irminmodels.WorkflowableTypeAction:
			actionWorkflowable, createWorkflowableErr = api.createActionWorkflowable(txDB, workspace, &workflowableReq)
		case irminmodels.WorkflowableTypePipeline:
			pipelineWorkflowable, createWorkflowableErr = api.createPipelineWorkflowable(
				txDB,
				workspace,
				&workflowableReq,
				workflow.ID, // Pass existing workflow ID for updates
			)
		default:
			return fmt.Errorf("invalid workflowable type: %s", workflowableReq.Type)
		}
		if createWorkflowableErr != nil {
			return NewInternalErrorf("error creating workflowable: %w", createWorkflowableErr)
		}

		// Delete existing workflowable
		if deleteWorkflowableErr := api.deleteExistingWorkflowable(tx, workflow); deleteWorkflowableErr != nil {
			return NewInternalErrorf("error deleting existing workflowable: %w", deleteWorkflowableErr)
		}

		// Update workflow with new workflowable
		api.updateWorkflowWithWorkflowable(
			workflow,
			importWorkflowable,
			exportWorkflowable,
			actionWorkflowable,
			pipelineWorkflowable,
		)
		if saveWorkflowErr := tx.Save(workflow).Error; saveWorkflowErr != nil {
			return NewInternalErrorf("error saving workflow: %w", saveWorkflowErr)
		}

		// Fetch the full workflow object with all relations
		return tx.Preload("Owner").
			Preload("Schedule").
			Preload("Import").
			Preload("Export").
			Preload("Action").
			Preload("Pipeline.Stages").
			Preload("Tags").
			First(workflow, workflow.ID).
			Error
	})

	if txErr != nil {
		api.Logger.ErrorContext(c, "Error updating workflow", "error", txErr)
		return nil, NewInternalErrorf("error in database transaction: %w", txErr)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: "Workflow workflowable configuration updated",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the workflow
	return workflow, nil
}

func (api *APIServices) UpdateWorkflowSchedule(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	workflow *db.Workflow,
	schedule *db.Schedule,
) (*db.Workflow, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceWorkflow,
		&workflow.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to update workflow",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"workflow",
			workflow.Name,
		)
		return nil, ErrAccessDenied
	}

	// Update the workflow schedule
	txErr := api.DB.Transaction(func(tx *gorm.DB) error {
		newSchedule := schedule
		// Create the schedule in the database.
		if createScheduleErr := tx.Create(&newSchedule).Error; createScheduleErr != nil {
			api.Logger.ErrorContext(c, "Error creating schedule", "error", createScheduleErr)
			return NewInternalErrorf("error creating schedule: %w", createScheduleErr)
		}

		// Delete the current associated schedule object and its triggers.
		if workflow.ScheduleID != nil {
			if deleteScheduleTriggersErr := tx.Where("schedule_id = ?", *workflow.ScheduleID).Delete(&db.WorkflowTrigger{}).Error; deleteScheduleTriggersErr != nil {
				api.Logger.ErrorContext(c, "Error deleting schedule triggers", "error", deleteScheduleTriggersErr)
				return NewInternalErrorf("error deleting schedule triggers: %w", deleteScheduleTriggersErr)
			}
			if deleteScheduleErr := tx.Delete(&db.Schedule{}, *workflow.ScheduleID).Error; deleteScheduleErr != nil {
				api.Logger.ErrorContext(c, "Error deleting schedule", "error", deleteScheduleErr)
				return NewInternalErrorf("error deleting schedule: %w", deleteScheduleErr)
			}
		}

		// Update the workflow record with the new schedule object.
		workflow.ScheduleID = &newSchedule.ID
		workflow.Schedule = newSchedule
		if updateWorkflowErr := tx.Save(workflow).Error; updateWorkflowErr != nil {
			api.Logger.ErrorContext(c, "Error updating workflow", "error", updateWorkflowErr)
			return NewInternalErrorf("error updating workflow: %w", updateWorkflowErr)
		}

		return nil
	})
	if txErr != nil {
		api.Logger.ErrorContext(c, "Error updating workflow schedule", "error", txErr)
		return nil, txErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: "Workflow schedule updated",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the workflow
	return workflow, nil
}

// DeleteWorkflow deletes a workflow.
//
//nolint:dupl // Each resource type needs its own service method following similar patterns.
func (api *APIServices) DeleteWorkflow(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	workflow *db.Workflow,
) error {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceWorkflow,
		&workflow.ID,
		db.PolicyActionDelete,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to delete workflow",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"workflow",
			workflow.Name,
		)
		return ErrAccessDenied
	}

	// Delete the workflow and all related records
	deleteWorkflowErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return api.DB.DeleteWorkflow(tx, workflow.ID) // This DB utility will delete all related records as well.
	})
	if deleteWorkflowErr != nil {
		api.Logger.ErrorContext(c, "Error deleting workflow", "error", deleteWorkflowErr)
		return NewInternalErrorf("error deleting workflow: %w", deleteWorkflowErr)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: "Workflow deleted",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	return nil
}

func (api *APIServices) TransferWorkflowOwnership(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	workflow *db.Workflow,
	req irmincore.TransferWorkflowOwnershipRequest,
) (*db.Workflow, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceWorkflow,
		&workflow.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to transfer workflow ownership",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"workflow",
			workflow.Name,
		)
		return nil, ErrAccessDenied
	}

	// Validate and decode the new owner SQID
	newOwnerID, err := api.SQIDManager.Decode("users", req.NewOwnerID)
	if err != nil {
		api.Logger.ErrorContext(c, "Error decoding SQID", "sqid", req.NewOwnerID, "type", "users", "error", err)
		return nil, ErrNewOwnerInvalid
	}

	// Make sure the new owner is not the current owner
	if uint(newOwnerID) == workflow.OwnerID {
		return nil, ErrNewOwnerInvalid
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, isUserInWorkspaceErr := api.DB.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
	if isUserInWorkspaceErr != nil {
		api.Logger.ErrorContext(c, "Error checking if user is in workspace", "error", isUserInWorkspaceErr)
		return nil, NewInternalErrorf("error checking if user is in workspace: %w", isUserInWorkspaceErr)
	}
	if !inWorkspace {
		return nil, ErrNewOwnerInvalid
	}

	// Get the new owner's information for the audit log
	newOwner, getNewOwnerErr := api.DB.GetUser(uint(newOwnerID))
	if getNewOwnerErr != nil {
		api.Logger.ErrorContext(c, "Error fetching new owner information", "error", getNewOwnerErr)
		return nil, NewInternalErrorf("error fetching new owner information: %w", getNewOwnerErr)
	}

	// Update the workflow record.
	workflow.OwnerID = uint(newOwnerID)
	workflow.Owner = *newOwner
	if updateWorkflowErr := api.DB.Save(&workflow).Error; updateWorkflowErr != nil {
		api.Logger.ErrorContext(c, "Error updating workflow", "error", updateWorkflowErr)
		return nil, updateWorkflowErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Workflow ownership transferred to %s", newOwner.Email),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the workflow
	return workflow, nil
}

func (api *APIServices) PauseWorkflow(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	workflow *db.Workflow,
) (*db.Workflow, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceWorkflow,
		&workflow.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to pause workflow",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"workflow",
			workflow.Name,
		)
		return nil, ErrAccessDenied
	}

	// Make sure the workflow is not already paused
	if workflow.Paused {
		return nil, ErrWorkflowAlreadyPaused
	}

	// Pause the workflow
	workflow.Paused = true
	if updateWorkflowErr := api.DB.Save(&workflow).Error; updateWorkflowErr != nil {
		api.Logger.ErrorContext(c, "Error pausing workflow", "error", updateWorkflowErr)
		return nil, updateWorkflowErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: "Workflow paused",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the workflow
	return workflow, nil
}

func (api *APIServices) StartWorkflow(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	workflow *db.Workflow,
) (*db.Workflow, error) {
	// Make sure this is allowed
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceWorkflow,
		&workflow.ID,
		db.PolicyActionUpdate,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, NewInternalErrorf("error checking permissions: %w", err)
	}
	if !isAllowed {
		api.Logger.ErrorContext(
			c,
			"User is not allowed to start workflow",
			"user",
			user.Email,
			"workspace",
			workspace.Slug,
			"workflow",
			workflow.Name,
		)
		return nil, ErrAccessDenied
	}

	// Make sure the workflow is not already running
	if !workflow.Paused {
		return nil, ErrWorkflowAlreadyRunning
	}

	// Start the workflow
	workflow.Paused = false
	if updateWorkflowErr := api.DB.Save(&workflow).Error; updateWorkflowErr != nil {
		api.Logger.ErrorContext(c, "Error starting workflow", "error", updateWorkflowErr)
		return nil, updateWorkflowErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: "Workflow resumed",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the workflow
	return workflow, nil
}

// ---- Helper functions ----

// createWorkflowRecord is a helper function to create a workflow record.
func (api *APIServices) createWorkflowRecord(
	req *irmincore.WorkflowRequest,
	user *db.User,
	workspace *db.Workspace,
	schedule *db.Schedule,
	importWorkflowable *db.ImportWorkflowable,
	exportWorkflowable *db.ExportWorkflowable,
	actionWorkflowable *db.ActionWorkflowable,
	pipelineWorkflowable *db.PipelineWorkflowable,
) db.Workflow {
	switch {
	case importWorkflowable != nil:
		return db.Workflow{
			Name:          req.Name,
			Description:   req.Description,
			Documentation: req.Documentation,
			Type:          irminmodels.WorkflowableTypeImport,
			OwnerID:       user.ID,
			WorkspaceID:   workspace.ID,
			ScheduleID:    &schedule.ID,
			ImportID:      &importWorkflowable.ID,
		}
	case exportWorkflowable != nil:
		return db.Workflow{
			Name:          req.Name,
			Description:   req.Description,
			Documentation: req.Documentation,
			Type:          irminmodels.WorkflowableTypeExport,
			OwnerID:       user.ID,
			WorkspaceID:   workspace.ID,
			ScheduleID:    &schedule.ID,
			ExportID:      &exportWorkflowable.ID,
		}
	case actionWorkflowable != nil:
		return db.Workflow{
			Name:          req.Name,
			Description:   req.Description,
			Documentation: req.Documentation,
			Type:          irminmodels.WorkflowableTypeAction,
			OwnerID:       user.ID,
			WorkspaceID:   workspace.ID,
			ScheduleID:    &schedule.ID,
			ActionID:      &actionWorkflowable.ID,
		}
	case pipelineWorkflowable != nil:
		return db.Workflow{
			Name:          req.Name,
			Description:   req.Description,
			Documentation: req.Documentation,
			Type:          irminmodels.WorkflowableTypePipeline,
			OwnerID:       user.ID,
			WorkspaceID:   workspace.ID,
			ScheduleID:    &schedule.ID,
			PipelineID:    &pipelineWorkflowable.ID,
		}
	default:
		return db.Workflow{}
	}
}

// deleteExistingWorkflowable is a helper function to delete existing workflowable.
func (api *APIServices) deleteExistingWorkflowable(tx *gorm.DB, workflow *db.Workflow) error {
	if workflow.Action != nil {
		if err := tx.Delete(&db.ActionWorkflowable{}, workflow.Action.ID).Error; err != nil {
			return NewInternalErrorf("error deleting action workflowable: %w", err)
		}
	}
	if workflow.Import != nil {
		if err := tx.Delete(&db.ImportWorkflowable{}, workflow.Import.ID).Error; err != nil {
			return NewInternalErrorf("error deleting import workflowable: %w", err)
		}
	}
	if workflow.Export != nil {
		if err := tx.Delete(&db.ExportWorkflowable{}, workflow.Export.ID).Error; err != nil {
			return NewInternalErrorf("error deleting export workflowable: %w", err)
		}
	}
	if workflow.Pipeline != nil {
		if err := tx.Delete(&db.PipelineWorkflowable{}, workflow.Pipeline.ID).Error; err != nil {
			return NewInternalErrorf("error deleting pipeline workflowable: %w", err)
		}
	}
	return nil
}

// updateWorkflowWithWorkflowable is a helper function to update workflow with new workflowable.
func (api *APIServices) updateWorkflowWithWorkflowable(
	workflow *db.Workflow,
	importWorkflowable *db.ImportWorkflowable,
	exportWorkflowable *db.ExportWorkflowable,
	actionWorkflowable *db.ActionWorkflowable,
	pipelineWorkflowable *db.PipelineWorkflowable,
) {
	switch {
	case importWorkflowable != nil:
		workflow.ImportID = &importWorkflowable.ID
	case exportWorkflowable != nil:
		workflow.ExportID = &exportWorkflowable.ID
	case actionWorkflowable != nil:
		workflow.ActionID = &actionWorkflowable.ID
	case pipelineWorkflowable != nil:
		workflow.PipelineID = &pipelineWorkflowable.ID
	}
}

// createWorkflowableByType is a helper function to create workflowable by type.
func (api *APIServices) createWorkflowableByType(
	txDB *db.Database,
	workspace *db.Workspace,
	req *irmincore.WorkflowRequest,
	workflowID uint,
) (*db.ImportWorkflowable, *db.ExportWorkflowable, *db.ActionWorkflowable, *db.PipelineWorkflowable, error) {
	var err error
	var importWorkflowable *db.ImportWorkflowable
	var exportWorkflowable *db.ExportWorkflowable
	var actionWorkflowable *db.ActionWorkflowable
	var pipelineWorkflowable *db.PipelineWorkflowable

	// Convert workflowable config to the correct struct
	var wflConfig irminmodels.Workflowable
	jsonBytes, marshalErr := json.Marshal(req.Workflowable)
	if marshalErr != nil {
		return nil, nil, nil, nil, NewInternalErrorf("error marshaling workflowable configuration: %w", marshalErr)
	}
	if unmarshalErr := json.Unmarshal(jsonBytes, &wflConfig); unmarshalErr != nil {
		return nil, nil, nil, nil, NewInternalErrorf("error unmarshaling workflowable configuration: %w", unmarshalErr)
	}

	switch req.Type {
	case irminmodels.WorkflowableTypeImport:
		importWorkflowable, _, err = api.createImportExportWorkflowable(
			txDB,
			workspace,
			&wflConfig,
			irminmodels.WorkflowableTypeImport,
		)
	case irminmodels.WorkflowableTypeExport:
		_, exportWorkflowable, err = api.createImportExportWorkflowable(
			txDB,
			workspace,
			&wflConfig,
			irminmodels.WorkflowableTypeExport,
		)
	case irminmodels.WorkflowableTypeAction:
		actionWorkflowable, err = api.createActionWorkflowable(txDB, workspace, &wflConfig)
	case irminmodels.WorkflowableTypePipeline:
		pipelineWorkflowable, err = api.createPipelineWorkflowable(txDB, workspace, &wflConfig, workflowID)
	default:
		return nil, nil, nil, nil, fmt.Errorf("invalid workflow type: %s", req.Type)
	}
	return importWorkflowable, exportWorkflowable, actionWorkflowable, pipelineWorkflowable, err
}

// createImportExportWorkflowable is a helper function to create import or export workflowable.
func (api *APIServices) createImportExportWorkflowable(
	txDB *db.Database,
	workspace *db.Workspace,
	wflConfig *irminmodels.Workflowable,
	workflowableType irminmodels.WorkflowableType,
) (*db.ImportWorkflowable, *db.ExportWorkflowable, error) {
	// Validate config type matches expected workflowableType
	if wflConfig.Type != workflowableType {
		return nil, nil, fmt.Errorf("%s configuration is required", workflowableType)
	}

	// Find the repository by slug (using transaction connection)
	repo, err := txDB.GetRepositoryBySlugAndWorkspaceID(wflConfig.Repository, workspace.ID)
	if err != nil {
		return nil, nil, NewInternalErrorf("error getting repository: %w", err)
	}

	// Find the connection by ID (using transaction connection)
	connectionID, err := api.SQIDManager.Decode("connections", wflConfig.ConnectionID)
	if err != nil {
		return nil, nil, NewInternalErrorf("error decoding connection SQID: %w", err)
	}
	conn, err := txDB.GetConnectionByID(uint(connectionID))
	if err != nil {
		return nil, nil, NewInternalErrorf("error getting connection: %w", err)
	}

	// Process import/export paths (remove leading slashes)
	trimmedImportFromConnectionPaths := make([]string, len(wflConfig.ImportFromConnectionPaths))
	for i, path := range wflConfig.ImportFromConnectionPaths {
		trimmedImportFromConnectionPaths[i] = strings.TrimPrefix(path, "/")
	}

	trimmedImportToRepositoryPath := strings.TrimPrefix(wflConfig.ImportToRepositoryPath, "/")

	trimmedExportToConnectionPath := strings.TrimPrefix(wflConfig.ExportToConnectionPath, "/")

	trimmedExportFromRepositoryPaths := make([]string, len(wflConfig.ExportFromRepositoryPaths))
	for i, path := range wflConfig.ExportFromRepositoryPaths {
		trimmedExportFromRepositoryPaths[i] = strings.TrimPrefix(path, "/")
	}

	// Process field mappings
	fieldMappings := make([]irminmodels.FieldMapping, len(wflConfig.FieldMappings))
	for i, mapping := range wflConfig.FieldMappings {
		var sourceField *string
		if mapping.SourceField != nil {
			sourceField = mapping.SourceField
		}

		var destinationField *string
		if mapping.DestinationField != nil {
			destinationField = mapping.DestinationField
		}

		fieldMappings[i] = irminmodels.FieldMapping{
			SourcePath:       strings.TrimPrefix(mapping.SourcePath, "/"),
			SourceField:      sourceField,
			DestinationPath:  strings.TrimPrefix(mapping.DestinationPath, "/"),
			DestinationField: destinationField,
		}
	}

	// Determine sync mode (default to "auto" if not set)
	syncMode := "auto"
	if wflConfig.SyncMode != "" {
		syncMode = string(wflConfig.SyncMode)
	}

	// Handle import workflowable case
	if workflowableType == irminmodels.WorkflowableTypeImport {
		// Validate connector capability
		if validateCapabilityErr := api.validateConnectionCapability(conn, irminmodels.ConnectorCapabilityPull); validateCapabilityErr != nil {
			return nil, nil, validateCapabilityErr
		}

		// Create import workflowable
		importWorkflowable := &db.ImportWorkflowable{
			ConnectionID:              conn.ID,
			ImportFromConnectionPaths: trimmedImportFromConnectionPaths,
			RepositoryID:              repo.ID,
			RepositoryBranch:          wflConfig.RepositoryBranch,
			ImportToRepositoryPath:    trimmedImportToRepositoryPath,
			FieldMappings:             fieldMappings,
			SyncMode:                  syncMode,
		}
		if createImportWorkflowableErr := txDB.Create(importWorkflowable).Error; createImportWorkflowableErr != nil {
			return nil, nil, createImportWorkflowableErr
		}
		return importWorkflowable, nil, nil
	}

	// Validate connector capability for export
	if validateCapabilityErr := api.validateConnectionCapability(conn, irminmodels.ConnectorCapabilityPush); validateCapabilityErr != nil {
		return nil, nil, validateCapabilityErr
	}

	// Handle export workflowable case
	exportWorkflowable := &db.ExportWorkflowable{
		ConnectionID:              conn.ID,
		ExportToConnectionPath:    trimmedExportToConnectionPath,
		RepositoryID:              repo.ID,
		RepositoryBranch:          wflConfig.RepositoryBranch,
		ExportFromRepositoryPaths: trimmedExportFromRepositoryPaths,
		FieldMappings:             fieldMappings,
		SyncMode:                  syncMode,
	}
	if createExportWorkflowableErr := txDB.Create(exportWorkflowable).Error; createExportWorkflowableErr != nil {
		return nil, nil, createExportWorkflowableErr
	}
	return nil, exportWorkflowable, nil
}

// createActionWorkflowable is a helper function to create action workflowable.
func (api *APIServices) createActionWorkflowable(
	txDB *db.Database,
	workspace *db.Workspace,
	config *irminmodels.Workflowable,
) (*db.ActionWorkflowable, error) {
	if config == nil {
		return nil, errors.New("action configuration is required")
	}

	// Process input data
	inputData, err := api.processActionWorkflowableInputs(txDB, workspace, config.Input)
	if err != nil {
		return nil, err
	}

	// Handle repository if specified
	repository, err := api.getActionWorkflowableRepository(txDB, workspace, config.Repository)
	if err != nil && !errors.Is(err, errRepositoryNotSpecified) {
		return nil, err
	}

	// Validate and process executable type
	scriptID, queryID, err := api.processActionWorkflowableExecutable(txDB, config)
	if err != nil {
		return nil, err
	}

	// Create workflowable
	workflowable, err := api.buildActionWorkflowable(config, repository, scriptID, queryID, inputData)
	if err != nil {
		return nil, err
	}

	if createActionWorkflowableErr := txDB.Create(&workflowable).Error; createActionWorkflowableErr != nil {
		return nil, createActionWorkflowableErr
	}
	return &workflowable, nil
}

// processActionWorkflowableInputs processes input data for an action workflowable.
func (api *APIServices) processActionWorkflowableInputs(
	txDB *db.Database,
	workspace *db.Workspace,
	inputs []irminmodels.ActionInputData,
) ([]db.ActionWorkflowableInput, error) {
	var inputData []db.ActionWorkflowableInput

	for _, inputObject := range inputs {
		repository, err := txDB.GetRepositoryBySlugAndWorkspaceID(
			inputObject.Repository,
			workspace.ID,
		)
		if err != nil {
			return nil, NewInternalErrorf("error getting repository: %w", err)
		}

		path := strings.TrimPrefix(inputObject.RepositoryPath, "/")
		inputData = append(inputData, db.ActionWorkflowableInput{
			RepositoryID:   repository.ID,
			RepositoryRef:  inputObject.RepositoryRef,
			RepositoryPath: path,
		})
	}

	return inputData, nil
}

var errRepositoryNotSpecified = errors.New("repository not specified")

// getActionWorkflowableRepository retrieves the repository for an action workflowable if specified.
func (api *APIServices) getActionWorkflowableRepository(
	txDB *db.Database,
	workspace *db.Workspace,
	repositorySlug string,
) (*db.Repository, error) {
	if repositorySlug == "" {
		return nil, errRepositoryNotSpecified
	}

	repository, err := txDB.GetRepositoryBySlugAndWorkspaceID(
		repositorySlug,
		workspace.ID,
	)
	if err != nil {
		return nil, NewInternalErrorf("error getting repository: %w", err)
	}

	return repository, nil
}

// processActionWorkflowableExecutable validates and processes the executable type for an action workflowable.
func (api *APIServices) processActionWorkflowableExecutable(
	txDB *db.Database,
	config *irminmodels.Workflowable,
) (*uint, *uint, error) {
	// Validate ExecutableType
	if config.ExecutableType == "" {
		return nil, nil, errors.New("executable type is required for action workflowable")
	}
	if config.ExecutableType != irminmodels.ActionExecutableTypeScript &&
		config.ExecutableType != irminmodels.ActionExecutableTypeQuery {
		return nil, nil, fmt.Errorf("invalid executable type: %s", config.ExecutableType)
	}

	// Handle script or query based on ExecutableType
	switch config.ExecutableType {
	case irminmodels.ActionExecutableTypeScript:
		return api.processActionWorkflowableScript(txDB, config.ScriptID)
	case irminmodels.ActionExecutableTypeQuery:
		return api.processActionWorkflowableQuery(txDB, config.QueryID)
	default:
		return nil, nil, fmt.Errorf("invalid executable type: %s", config.ExecutableType)
	}
}

// processActionWorkflowableScript processes a script executable for an action workflowable.
func (api *APIServices) processActionWorkflowableScript(
	txDB *db.Database,
	scriptID *string,
) (*uint, *uint, error) {
	if scriptID == nil {
		return nil, nil, errors.New("script ID is required for script executable type")
	}
	decodedScriptID, err := api.SQIDManager.Decode("scripts", *scriptID)
	if err != nil {
		return nil, nil, NewInternalErrorf("error decoding script SQID: %w", err)
	}
	script, err := txDB.GetStoredScriptByID(uint(decodedScriptID))
	if err != nil {
		return nil, nil, NewInternalErrorf("error getting script: %w", err)
	}
	return &script.ID, nil, nil
}

// processActionWorkflowableQuery processes a query executable for an action workflowable.
func (api *APIServices) processActionWorkflowableQuery(
	txDB *db.Database,
	queryID *string,
) (*uint, *uint, error) {
	if queryID == nil {
		return nil, nil, errors.New("query ID is required for query executable type")
	}
	decodedQueryID, err := api.SQIDManager.Decode("queries", *queryID)
	if err != nil {
		return nil, nil, NewInternalErrorf("error decoding query SQID: %w", err)
	}
	query, err := txDB.GetStoredQueryByID(uint(decodedQueryID))
	if err != nil {
		return nil, nil, NewInternalErrorf("error getting query: %w", err)
	}
	return nil, &query.ID, nil
}

// buildActionWorkflowable builds an ActionWorkflowable from the provided components.
func (api *APIServices) buildActionWorkflowable(
	config *irminmodels.Workflowable,
	repository *db.Repository,
	scriptID *uint,
	queryID *uint,
	inputData []db.ActionWorkflowableInput,
) (db.ActionWorkflowable, error) {
	if repository != nil {
		// Validate that required repository result fields are provided
		if config.ResultsRepositoryBranch == nil {
			return db.ActionWorkflowable{}, errors.New(
				"results repository branch is required when repository is specified",
			)
		}
		if config.ResultsRepositoryPath == nil {
			return db.ActionWorkflowable{}, errors.New(
				"results repository path is required when repository is specified",
			)
		}

		repositoryID := repository.ID
		branch := *config.ResultsRepositoryBranch
		path := strings.TrimPrefix(*config.ResultsRepositoryPath, "/")

		return db.ActionWorkflowable{
			ExecutableType:          config.ExecutableType,
			ScriptID:                scriptID,
			QueryID:                 queryID,
			ResultsRepositoryID:     &repositoryID,
			ResultsRepositoryBranch: &branch,
			ResultsRepositoryPath:   &path,
			Inputs:                  inputData,
		}, nil
	}

	return db.ActionWorkflowable{
		ExecutableType: config.ExecutableType,
		ScriptID:       scriptID,
		QueryID:        queryID,
		Inputs:         inputData,
	}, nil
}

// createPipelineWorkflowable is a helper function to create pipeline workflowable.
func (api *APIServices) createPipelineWorkflowable(
	txDB *db.Database,
	workspace *db.Workspace,
	config *irminmodels.Workflowable,
	workflowID uint,
) (*db.PipelineWorkflowable, error) {
	if config == nil {
		return nil, errors.New("pipeline configuration is required")
	}

	// Validate pipeline stages
	if err := api.validatePipelineStages(config.Stages); err != nil {
		return nil, err
	}

	// Process stages
	var stages []db.PipelineStage
	for orderSequence, stage := range config.Stages {
		newStage := db.PipelineStage{
			OrderSequence: orderSequence,
			Description:   stage.Description,
			Write:         stage.Write,
			Read:          stage.Read,
		}

		err := api.processStageByType(txDB, &newStage, stage, workspace, workflowID)
		if err != nil {
			return nil, err
		}

		stages = append(stages, newStage)
	}

	// Create workflowable
	pipelineWorkflowable := &db.PipelineWorkflowable{
		Stages: stages,
	}
	if createPipelineWorkflowableErr := txDB.Create(pipelineWorkflowable).Error; createPipelineWorkflowableErr != nil {
		return nil, createPipelineWorkflowableErr
	}
	return pipelineWorkflowable, nil
}

// validatePipelineStages validates pipeline stage configurations.
func (api *APIServices) validatePipelineStages(stages []irminmodels.PipelineStage) error {
	if len(stages) == 0 {
		return errors.New("pipeline must have at least one stage")
	}

	// For multi-stage pipelines, validate first and last stages
	if len(stages) > 1 {
		// Validate first stage: cannot be writeable (no previous results to consume)
		if stages[0].Write {
			return errors.New("first pipeline stage cannot be writeable (no previous results to consume)")
		}

		// Validate last stage: cannot be readable (no subsequent stage to pass results to)
		lastStageIndex := len(stages) - 1
		if stages[lastStageIndex].Read {
			return errors.New("last pipeline stage cannot be readable (no subsequent stage to pass results to)")
		}
	}
	// Single-stage pipelines can have any combination of Read/Write as they may:
	// - Read from external source and write to output (Read=true, Write=false)
	// - Read input and write to external destination (Read=false, Write=true)
	// - Or both (Read=true, Write=true)

	return nil
}

// processStageByType processes a stage based on its type.
func (api *APIServices) processStageByType(
	txDB *db.Database,
	newStage *db.PipelineStage,
	stage irminmodels.PipelineStage,
	workspace *db.Workspace,
	workflowID uint,
) error {
	switch stage.Type {
	case irminmodels.PipelineStageTypeAction:
		return api.processActionStage(txDB, newStage, stage)
	case irminmodels.PipelineStageTypeConnection:
		return api.processConnectionStage(txDB, newStage, stage)
	case irminmodels.PipelineStageTypeRepository:
		return api.processRepositoryStage(txDB, newStage, stage, workspace)
	case irminmodels.PipelineStageTypeRepositoryAction:
		return api.processRepositoryActionStage(txDB, newStage, stage, workspace)
	case irminmodels.PipelineStageTypeTriggerWorkflow:
		return api.processTriggerWorkflowStage(txDB, newStage, stage, workspace, workflowID)
	case irminmodels.PipelineStageTypeValidation:
		return api.processValidationStage(newStage, stage)
	case irminmodels.PipelineStageTypeTransform:
		return api.processTransformStage(newStage, stage)
	case irminmodels.PipelineStageTypeEmbeddings:
		return api.processEmbeddingsStage(txDB, newStage, stage, workspace)
	case irminmodels.PipelineStageTypePatch:
		return api.processPatchStage(txDB, newStage, stage, workspace)
	default:
		return fmt.Errorf("invalid stage type: %s", stage.Type)
	}
}

// processActionStage processes an action stage.
func (api *APIServices) processActionStage(
	txDB *db.Database,
	newStage *db.PipelineStage,
	stage irminmodels.PipelineStage,
) error {
	newStage.Type = db.PipelineStageTypeAction

	// Validate ExecutableType
	if err := api.validateExecutableType(stage.ExecutableType); err != nil {
		return err
	}

	newStage.ExecutableType = stage.ExecutableType

	// Handle script or query based on ExecutableType
	switch stage.ExecutableType {
	case irminmodels.ActionExecutableTypeScript:
		return api.processScriptStage(txDB, newStage, stage)
	case irminmodels.ActionExecutableTypeQuery:
		return api.processQueryStage(txDB, newStage, stage)
	default:
		return fmt.Errorf("invalid executable type: %s", stage.ExecutableType)
	}
}

// validateExecutableType validates that the executable type is valid.
func (api *APIServices) validateExecutableType(executableType irminmodels.ActionExecutableType) error {
	if executableType == "" {
		return errors.New("executable type is required for action stage")
	}
	if executableType != irminmodels.ActionExecutableTypeScript &&
		executableType != irminmodels.ActionExecutableTypeQuery {
		return fmt.Errorf("invalid executable type: %s", executableType)
	}
	return nil
}

// processScriptStage processes a script-based action stage.
func (api *APIServices) processScriptStage(
	txDB *db.Database,
	newStage *db.PipelineStage,
	stage irminmodels.PipelineStage,
) error {
	if stage.ScriptID == nil {
		return errors.New("script ID is required for script executable type")
	}
	scriptID, err := api.SQIDManager.Decode("scripts", *stage.ScriptID)
	if err != nil {
		return err
	}
	script, err := txDB.GetStoredScriptByID(uint(scriptID))
	if err != nil {
		return err
	}
	newStage.ScriptID = &script.ID
	return nil
}

// processQueryStage processes a query-based action stage.
func (api *APIServices) processQueryStage(
	txDB *db.Database,
	newStage *db.PipelineStage,
	stage irminmodels.PipelineStage,
) error {
	if stage.QueryID == nil {
		return errors.New("query ID is required for query executable type")
	}
	queryID, err := api.SQIDManager.Decode("queries", *stage.QueryID)
	if err != nil {
		return err
	}
	query, err := txDB.GetStoredQueryByID(uint(queryID))
	if err != nil {
		return err
	}
	newStage.QueryID = &query.ID
	return nil
}

// processConnectionStage processes a connection stage.
func (api *APIServices) processConnectionStage(
	txDB *db.Database,
	newStage *db.PipelineStage,
	stage irminmodels.PipelineStage,
) error {
	newStage.Type = db.PipelineStageTypeConnection
	if stage.ConnectionID == nil {
		return nil
	}

	parsedConnID, parseConnIDErr := api.SQIDManager.Decode("connections", *stage.ConnectionID)
	if parseConnIDErr != nil {
		return parseConnIDErr
	}

	connection, getConnectionByIDErr := txDB.GetConnectionByID(uint(parsedConnID))
	if getConnectionByIDErr != nil {
		return getConnectionByIDErr
	}

	if stage.Read {
		if err := api.validateConnectionCapability(connection, irminmodels.ConnectorCapabilityPull); err != nil {
			return err
		}
	}

	if stage.Write {
		if err := api.validateConnectionCapability(connection, irminmodels.ConnectorCapabilityPush); err != nil {
			return err
		}
	}

	newStage.ConnectionID = &connection.ID

	if stage.ConnectionReadPaths != nil {
		readPaths := []string{}
		for _, path := range *stage.ConnectionReadPaths {
			readPaths = append(readPaths, strings.TrimPrefix(path, "/"))
		}
		newStage.ConnectionReadPaths = readPaths
	} else {
		// Ensure ConnectionReadPaths is initialized as empty slice if nil to avoid PostgreSQL JSONB NULL error
		newStage.ConnectionReadPaths = []string{}
	}

	if stage.ConnectionWritePath != nil {
		writePath := strings.TrimPrefix(*stage.ConnectionWritePath, "/")
		newStage.ConnectionWritePath = &writePath
	}

	return nil
}

// processRepositoryStage processes a repository stage.
func (api *APIServices) processRepositoryStage(
	txDB *db.Database,
	newStage *db.PipelineStage,
	stage irminmodels.PipelineStage,
	workspace *db.Workspace,
) error {
	newStage.Type = db.PipelineStageTypeRepository
	if stage.Repository == nil {
		return nil
	}

	repository, getRepositoryBySlugAndWorkspaceIDErr := txDB.GetRepositoryBySlugAndWorkspaceID(
		*stage.Repository,
		workspace.ID,
	)
	if getRepositoryBySlugAndWorkspaceIDErr != nil {
		return getRepositoryBySlugAndWorkspaceIDErr
	}

	newStage.RepositoryID = &repository.ID

	if stage.RepositoryBranch != nil {
		newStage.RepositoryBranch = stage.RepositoryBranch
	}

	if stage.RepositoryReadPaths != nil {
		readPaths := []string{}
		for _, path := range *stage.RepositoryReadPaths {
			readPaths = append(readPaths, strings.TrimPrefix(path, "/"))
		}
		newStage.RepositoryReadPaths = readPaths
	} else {
		// Ensure RepositoryReadPaths is initialized as empty slice if nil to avoid PostgreSQL JSONB NULL error
		newStage.RepositoryReadPaths = []string{}
	}

	if stage.RepositoryWritePath != nil {
		writePath := strings.TrimPrefix(*stage.RepositoryWritePath, "/")
		newStage.RepositoryWritePath = &writePath
	}

	return nil
}

// processRepositoryActionStage processes a repository action stage.
func (api *APIServices) processRepositoryActionStage(
	txDB *db.Database,
	newStage *db.PipelineStage,
	stage irminmodels.PipelineStage,
	workspace *db.Workspace,
) error {
	newStage.Type = db.PipelineStageTypeRepositoryAction

	// Validate required fields
	if stage.RepositoryActionType == nil {
		return errors.New("repository action type is required")
	}

	if stage.RepositoryActionRepository == nil {
		return errors.New("repository is required for repository action stage")
	}

	if stage.RepositoryActionBranch == nil || *stage.RepositoryActionBranch == "" {
		return errors.New("branch is required for repository action stage")
	}

	// Validate target branch is required for merge action
	if *stage.RepositoryActionType == irminmodels.RepositoryActionTypeMerge {
		if stage.RepositoryActionTargetBranch == nil || *stage.RepositoryActionTargetBranch == "" {
			return errors.New("target branch is required for merge action")
		}
	}

	// Set action type
	newStage.RepositoryActionType = stage.RepositoryActionType

	// Get repository
	repository, err := txDB.GetRepositoryBySlugAndWorkspaceID(
		*stage.RepositoryActionRepository,
		workspace.ID,
	)
	if err != nil {
		return err
	}
	newStage.RepositoryActionRepositoryID = &repository.ID

	// Set branch
	newStage.RepositoryActionBranch = stage.RepositoryActionBranch

	// Set target branch (for merge)
	if stage.RepositoryActionTargetBranch != nil {
		newStage.RepositoryActionTargetBranch = stage.RepositoryActionTargetBranch
	}

	// Set commit message
	if stage.RepositoryActionCommitMessage != nil {
		newStage.RepositoryActionCommitMessage = stage.RepositoryActionCommitMessage
	}

	// Set revert path
	if stage.RepositoryActionRevertPath != nil {
		newStage.RepositoryActionRevertPath = stage.RepositoryActionRevertPath
	}

	// Set merge options
	if stage.RepositoryActionMergeStrategy != nil {
		newStage.RepositoryActionMergeStrategy = stage.RepositoryActionMergeStrategy
	}

	if stage.RepositoryActionSquash != nil {
		newStage.RepositoryActionSquash = stage.RepositoryActionSquash
	}

	if stage.RepositoryActionAllowEmpty != nil {
		newStage.RepositoryActionAllowEmpty = stage.RepositoryActionAllowEmpty
	}

	return nil
}

// processTriggerWorkflowStage processes a trigger workflow stage.
func (api *APIServices) processTriggerWorkflowStage(
	txDB *db.Database,
	newStage *db.PipelineStage,
	stage irminmodels.PipelineStage,
	workspace *db.Workspace,
	workflowID uint,
) error {
	newStage.Type = db.PipelineStageTypeTriggerWorkflow

	// Validate required field
	if stage.TriggerWorkflowID == nil {
		return errors.New("workflow ID is required for trigger workflow stage")
	}

	// Decode and validate workflow ID
	targetWorkflowID, err := api.SQIDManager.Decode("workflows", *stage.TriggerWorkflowID)
	if err != nil {
		return err
	}

	// Prevent self-reference (only check if workflowID is not 0, i.e., for updates)
	if workflowID != 0 && uint(targetWorkflowID) == workflowID {
		return errors.New("workflow cannot trigger itself (self-reference not allowed)")
	}

	// Verify the workflow exists and belongs to the same workspace
	targetWorkflow, err := txDB.GetWorkflowByID(uint(targetWorkflowID))
	if err != nil {
		return err
	}

	if targetWorkflow.WorkspaceID != workspace.ID {
		return errors.New("workflow must belong to the same workspace")
	}

	// Check for circular dependencies (only if workflowID is not 0, i.e., for updates)
	if workflowID != 0 {
		if circularDependencyCheckErr := api.checkForCircularWorkflowDependency(txDB, uint(targetWorkflowID), workflowID); circularDependencyCheckErr != nil {
			return circularDependencyCheckErr
		}
	}

	newStage.TriggerWorkflowID = &targetWorkflow.ID

	return nil
}

// checkForCircularWorkflowDependency checks if adding a trigger to targetWorkflowID
// would create a circular dependency with sourceWorkflowID.
func (api *APIServices) checkForCircularWorkflowDependency(
	txDB *db.Database,
	targetWorkflowID uint,
	sourceWorkflowID uint,
) error {
	// Get the target workflow with its pipeline stages
	var targetWorkflow db.Workflow
	if err := txDB.Preload("Pipeline.Stages.TriggerWorkflow").
		First(&targetWorkflow, targetWorkflowID).Error; err != nil {
		return err
	}

	// Check if target workflow is a pipeline
	if targetWorkflow.Pipeline == nil {
		return nil // Not a pipeline, no circular dependency possible
	}

	// Track visited workflows to detect cycles
	visited := make(map[uint]bool)
	return api.checkWorkflowDependencyRecursive(txDB, targetWorkflowID, sourceWorkflowID, visited)
}

// checkWorkflowDependencyRecursive recursively checks for circular dependencies.
func (api *APIServices) checkWorkflowDependencyRecursive(
	txDB *db.Database,
	currentWorkflowID uint,
	sourceWorkflowID uint,
	visited map[uint]bool,
) error {
	// If we've already visited this workflow, we have a cycle
	if visited[currentWorkflowID] {
		return nil // Already checked this path
	}

	// If current workflow is the source, we found a circular dependency
	if currentWorkflowID == sourceWorkflowID {
		return errors.New("circular workflow dependency detected")
	}

	visited[currentWorkflowID] = true

	// Get the current workflow with its pipeline stages
	var workflow db.Workflow
	if err := txDB.Preload("Pipeline.Stages").First(&workflow, currentWorkflowID).Error; err != nil {
		return err
	}

	// If not a pipeline, no further dependencies to check
	if workflow.Pipeline == nil {
		return nil
	}

	// Check all trigger workflow stages
	for _, stage := range workflow.Pipeline.Stages {
		if stage.Type == db.PipelineStageTypeTriggerWorkflow && stage.TriggerWorkflowID != nil {
			// Recursively check this triggered workflow
			if err := api.checkWorkflowDependencyRecursive(
				txDB,
				*stage.TriggerWorkflowID,
				sourceWorkflowID,
				visited,
			); err != nil {
				return err
			}
		}
	}

	return nil
}

// processValidationStage processes a validation stage.
func (api *APIServices) processValidationStage(
	newStage *db.PipelineStage,
	stage irminmodels.PipelineStage,
) error {
	newStage.Type = db.PipelineStageTypeValidation

	// Validation schema is required
	if stage.ValidationSchema == nil {
		return errors.New("validation schema is required for validation stage")
	}

	// Set default validation mode if not provided
	if stage.ValidationMode == nil {
		newStage.ValidationMode = &defaultValidationMode
	} else {
		newStage.ValidationMode = stage.ValidationMode
	}

	// Validate mode is either "single" or "all"
	if *newStage.ValidationMode != modeSingle && *newStage.ValidationMode != modeAll {
		return errors.New("validation mode must be either 'single' or 'all'")
	}

	newStage.ValidationSchema = stage.ValidationSchema
	newStage.FailOnError = stage.FailOnError
	newStage.ValidationTargetName = stage.ValidationTargetName

	return nil
}

// processTransformStage processes a transform stage.
func (api *APIServices) processTransformStage(
	newStage *db.PipelineStage,
	stage irminmodels.PipelineStage,
) error {
	newStage.Type = db.PipelineStageTypeTransform

	// Transform operation is required
	if stage.TransformOperation == nil {
		return errors.New("transform operation is required for transform stage")
	}

	// Validate operation type
	if err := api.validateTransformOperationType(stage.TransformOperation); err != nil {
		return err
	}

	newStage.TransformOperation = stage.TransformOperation

	// Set default transform mode if not provided
	if stage.TransformMode == nil {
		newStage.TransformMode = &defaultTransformMode
	} else {
		newStage.TransformMode = stage.TransformMode
	}

	// Validate mode is either "single" or "all"
	if *newStage.TransformMode != modeSingle && *newStage.TransformMode != modeAll {
		return errors.New("transform mode must be either 'single' or 'all'")
	}

	// Validate that target_name is provided when mode is "single"
	if *newStage.TransformMode == modeSingle {
		if stage.TransformTargetName == nil || *stage.TransformTargetName == "" {
			return errors.New("transform_target_name is required when transform_mode is 'single'")
		}
	}

	// Validate operation-specific requirements
	if err := api.validateTransformOperationRequirements(stage); err != nil {
		return err
	}

	newStage.TransformTargetName = stage.TransformTargetName
	newStage.TransformFieldRenames = stage.TransformFieldRenames
	newStage.TransformFieldsToRemove = stage.TransformFieldsToRemove
	newStage.TransformOutputName = stage.TransformOutputName
	newStage.TransformOutputFormat = stage.TransformOutputFormat

	return nil
}

// processEmbeddingsStage processes an embeddings stage.
func (api *APIServices) processEmbeddingsStage(
	txDB *db.Database,
	newStage *db.PipelineStage,
	stage irminmodels.PipelineStage,
	workspace *db.Workspace,
) error {
	newStage.Type = db.PipelineStageTypeEmbeddings

	// Embeddings operation is required
	if stage.EmbeddingsOperation == nil {
		return errors.New("embeddings operation is required for embeddings stage")
	}

	// Validate operation type
	operation := *stage.EmbeddingsOperation
	if operation != irminmodels.EmbeddingsOpVectorize && operation != irminmodels.EmbeddingsOpSearch {
		return fmt.Errorf("invalid embeddings operation: %s", operation)
	}

	newStage.EmbeddingsOperation = stage.EmbeddingsOperation

	// Embeddings repository is required
	if stage.EmbeddingsRepository == nil || *stage.EmbeddingsRepository == "" {
		return errors.New("embeddings repository is required for embeddings stage")
	}

	// Get repository by slug
	repository, err := txDB.GetRepositoryBySlugAndWorkspaceID(*stage.EmbeddingsRepository, workspace.ID)
	if err != nil {
		return fmt.Errorf("error getting repository: %w", err)
	}

	newStage.EmbeddingsRepositoryID = &repository.ID
	newStage.EmbeddingsBranch = stage.EmbeddingsBranch
	newStage.EmbeddingsModel = stage.EmbeddingsModel
	newStage.EmbeddingsDimensions = stage.EmbeddingsDimensions
	newStage.EmbeddingsChunkSize = stage.EmbeddingsChunkSize
	newStage.EmbeddingsOverlap = stage.EmbeddingsOverlap
	newStage.EmbeddingsTopK = stage.EmbeddingsTopK
	newStage.EmbeddingsFilter = stage.EmbeddingsFilter
	newStage.EmbeddingsMetadata = stage.EmbeddingsMetadata
	newStage.EmbeddingsPriority = stage.EmbeddingsPriority

	// Validate operation-specific requirements
	switch operation {
	case irminmodels.EmbeddingsOpVectorize:
		if stage.EmbeddingsOutputPath == nil || *stage.EmbeddingsOutputPath == "" {
			return errors.New("embeddings_output_path is required for vectorize operation")
		}
		newStage.EmbeddingsOutputPath = stage.EmbeddingsOutputPath
	case irminmodels.EmbeddingsOpSearch:
		if stage.EmbeddingsPath == nil || *stage.EmbeddingsPath == "" {
			return errors.New("embeddings_path is required for search operation")
		}
		if stage.EmbeddingsQuery == nil || *stage.EmbeddingsQuery == "" {
			return errors.New("embeddings_query is required for search operation")
		}
		newStage.EmbeddingsPath = stage.EmbeddingsPath
		newStage.EmbeddingsQuery = stage.EmbeddingsQuery
	}

	return nil
}

// processPatchStage processes a patch stage.
func (api *APIServices) processPatchStage(
	txDB *db.Database,
	newStage *db.PipelineStage,
	stage irminmodels.PipelineStage,
	workspace *db.Workspace,
) error {
	newStage.Type = db.PipelineStageTypePatch

	// Patch direction is required
	if stage.PatchDirection == nil {
		return errors.New("patch direction is required for patch stage")
	}

	// Validate direction is valid
	direction := *stage.PatchDirection
	if direction != irminmodels.PatchDirectionToConnection && direction != irminmodels.PatchDirectionToRepository {
		return fmt.Errorf("invalid patch direction: %s", direction)
	}

	patchDirection := db.PatchDirection(direction)
	newStage.PatchDirection = &patchDirection

	// Validate direction-specific requirements
	switch direction {
	case irminmodels.PatchDirectionToConnection:
		if stage.PatchConnectionID == nil || *stage.PatchConnectionID == "" {
			return errors.New("patch_connection_id is required when direction is to_connection")
		}
		connectionID, err := api.SQIDManager.Decode("connections", *stage.PatchConnectionID)
		if err != nil {
			return fmt.Errorf("invalid patch connection ID: %w", err)
		}
		// Verify connection exists and belongs to the current workspace
		connection, err := txDB.GetConnectionByIDAndWorkspaceID(uint(connectionID), workspace.ID)
		if err != nil {
			return fmt.Errorf("error getting patch connection: %w", err)
		}
		newStage.PatchConnectionID = &connection.ID

	case irminmodels.PatchDirectionToRepository:
		if stage.PatchRepository == nil || *stage.PatchRepository == "" {
			return errors.New("patch_repository is required when direction is to_repository")
		}
		repository, err := txDB.GetRepositoryBySlugAndWorkspaceID(*stage.PatchRepository, workspace.ID)
		if err != nil {
			return fmt.Errorf("error getting patch repository: %w", err)
		}
		newStage.PatchRepositoryID = &repository.ID
		newStage.PatchRepositoryBranch = stage.PatchRepositoryBranch
	}

	// Optional source file name
	newStage.PatchSourceFileName = stage.PatchSourceFileName

	return nil
}

// validateTransformOperationType validates that the transform operation is one of the supported types.
func (api *APIServices) validateTransformOperationType(operation *irminmodels.TransformOperationType) error {
	validOperations := []irminmodels.TransformOperationType{
		irminmodels.TransformOpFieldRename,
		irminmodels.TransformOpFieldRemove,
		irminmodels.TransformOpFileRename,
		irminmodels.TransformOpFileRemove,
		irminmodels.TransformOpFormatConvert,
	}
	if slices.Contains(validOperations, *operation) {
		return nil
	}
	return fmt.Errorf("invalid transform operation: %s", *operation)
}

// validateTransformOperationRequirements validates operation-specific requirements.
//
//nolint:gocognit // Nothing complex here
func (api *APIServices) validateTransformOperationRequirements(stage irminmodels.PipelineStage) error {
	switch *stage.TransformOperation {
	case irminmodels.TransformOpFieldRename:
		if len(stage.TransformFieldRenames) == 0 {
			return errors.New("transform_field_renames is required and must be non-empty for field_rename operation")
		}
		// Track old names and new names to detect duplicates
		oldNamesSeen := make(map[string]bool)
		newNamesSeen := make(map[string]bool)
		for i, rename := range stage.TransformFieldRenames {
			if rename.OldName == "" {
				return fmt.Errorf("transform_field_renames[%d].old_name cannot be empty", i)
			}
			if rename.NewName == "" {
				return fmt.Errorf("transform_field_renames[%d].new_name cannot be empty", i)
			}
			// Check for duplicate OldName values
			if oldNamesSeen[rename.OldName] {
				return fmt.Errorf("transform_field_renames contains duplicate old_name: %s", rename.OldName)
			}
			oldNamesSeen[rename.OldName] = true
			// Check for duplicate NewName values
			if newNamesSeen[rename.NewName] {
				return fmt.Errorf("transform_field_renames contains duplicate new_name: %s", rename.NewName)
			}
			newNamesSeen[rename.NewName] = true
		}
	case irminmodels.TransformOpFieldRemove:
		if len(stage.TransformFieldsToRemove) == 0 {
			return errors.New("transform_fields_to_remove is required and must be non-empty for field_remove operation")
		}
	case irminmodels.TransformOpFileRename:
		if stage.TransformOutputName == nil || *stage.TransformOutputName == "" {
			return errors.New("transform_output_name is required for file_rename operation")
		}
	case irminmodels.TransformOpFormatConvert:
		if err := api.validateTransformOutputFormat(stage.TransformOutputFormat); err != nil {
			return err
		}
	case irminmodels.TransformOpFileRemove:
		// file_remove doesn't require additional fields beyond mode and target_name
	}
	return nil
}

// validateTransformOutputFormat validates the output format for format conversion.
func (api *APIServices) validateTransformOutputFormat(format *irminmodels.OutputFormat) error {
	if format == nil {
		return errors.New("transform_output_format is required for format_convert operation")
	}

	validFormats := []irminmodels.OutputFormat{
		irminmodels.OutputFormatCSV,
		irminmodels.OutputFormatJSON,
		irminmodels.OutputFormatParquet,
	}
	for _, validFmt := range validFormats {
		if *format == validFmt {
			return nil
		}
	}
	return fmt.Errorf("invalid output format: %s (must be csv, json, or parquet)", *format)
}

func (api *APIServices) addWorkflowTags(tx *gorm.DB, workflow *db.Workflow, tags []string, workspaceID uint) error {
	if len(tags) > 0 {
		for _, tagSqid := range tags {
			tagID, tagDecodeErr := api.SQIDManager.Decode("tags", tagSqid)
			if tagDecodeErr != nil {
				return tagDecodeErr
			}

			// Verify tag belongs to the workspace
			var tag db.Tag
			if err := tx.First(&tag, uint(tagID)).Error; err != nil {
				return err
			}
			if tag.WorkspaceID != workspaceID {
				return ErrInvalidRequest
			}

			if tagAppendErr := tx.Model(workflow).Association("Tags").Append(&db.Tag{Model: gorm.Model{ID: uint(tagID)}}); tagAppendErr != nil {
				return tagAppendErr
			}
		}
	}
	return nil
}

// validateConnectionCapability validates that the connection has the required capability.
func (api *APIServices) validateConnectionCapability(
	conn *db.Connection,
	requiredCapability irminmodels.ConnectorCapability,
) error {
	for _, capability := range conn.Connector.Capabilities {
		if capability == string(requiredCapability) {
			return nil
		}
	}

	switch requiredCapability {
	case irminmodels.ConnectorCapabilityPull:
		return ErrConnectorMissingPullCapability
	case irminmodels.ConnectorCapabilityPush:
		return ErrConnectorMissingPushCapability
	case irminmodels.ConnectorCapabilityApplyPatch:
		return ErrConnectorMissingPatchCapability
	case irminmodels.ConnectorCapabilityPatchEvent:
		return ErrConnectorMissingWebhookCapability
	default:
		return fmt.Errorf("connector does not support %s operations", requiredCapability)
	}
}

func (api *APIServices) createWorkflowSchedule(tx *gorm.DB, schedule *db.Schedule) error {
	if createScheduleErr := tx.Create(schedule).Error; createScheduleErr != nil {
		return NewInternalErrorf("error creating workflow schedule: %w", createScheduleErr)
	}
	return nil
}
