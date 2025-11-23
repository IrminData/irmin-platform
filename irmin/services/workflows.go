package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"strings"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

// GetWorkflow gets a workflow by its SQID.
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
		return nil, err
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
		return nil, err
	}
	if !isAllowed {
		return nil, ErrAccessDenied
	}

	// Get the workflow
	workflow, err := api.DB.GetWorkflowByID(uint(workflowID))
	if err != nil {
		api.Logger.ErrorContext(c, "Error getting workflow", "error", err)
		return nil, err
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
		return nil, err
	}

	// Filter workflows based on user permissions
	filteredWorkflows, err := lib.IsAllowedFilter(
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
		return nil, err
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
		return nil, err
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
	if req.Name != "" {
		workflow.Name = req.Name
	}
	if req.Description != "" {
		workflow.Description = req.Description
	}
	if req.Documentation != "" {
		workflow.Documentation = req.Documentation
	}

	// Save the workflow
	if saveErr := api.DB.Save(workflow).Error; saveErr != nil {
		api.Logger.ErrorContext(c, "Error updating workflow", "error", saveErr, "workflow_id", workflow.ID)
		return nil, saveErr
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
		return nil, err
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
		return nil, parseScheduleErr
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
		)
		if createWorkflowableErr != nil {
			return createWorkflowableErr
		}

		// Create schedule
		if createScheduleErr := api.createWorkflowSchedule(tx, schedule); createScheduleErr != nil {
			return createScheduleErr
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
			return createWorkflowErr
		}

		// Add tags
		if addTagsErr := api.addWorkflowTags(tx, &workflow, req.Tags, workspace.ID); addTagsErr != nil {
			return addTagsErr
		}

		// Fetch the full workflow object with all relations
		return tx.Preload("Owner").
			Preload("Schedule").
			Preload("Import").
			Preload("Export").
			Preload("Action").
			Preload("Pipeline").
			First(&workflow, workflow.ID).
			Error
	})

	if txErr != nil {
		api.Logger.ErrorContext(c, "Error creating workflow", "error", txErr)
		return nil, txErr
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
		return nil, err
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
			)
		default:
			return fmt.Errorf("invalid workflowable type: %s", workflowableReq.Type)
		}
		if createWorkflowableErr != nil {
			return createWorkflowableErr
		}

		// Delete existing workflowable
		if deleteWorkflowableErr := api.deleteExistingWorkflowable(tx, workflow); deleteWorkflowableErr != nil {
			return deleteWorkflowableErr
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
			return saveWorkflowErr
		}

		// Fetch the full workflow object with all relations
		return tx.Preload("Owner").
			Preload("Schedule").
			Preload("Import").
			Preload("Export").
			Preload("Action").
			Preload("Pipeline").
			First(workflow, workflow.ID).
			Error
	})

	if txErr != nil {
		api.Logger.ErrorContext(c, "Error updating workflow", "error", txErr)
		return nil, txErr
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
		return nil, err
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
			return createScheduleErr
		}

		// Delete the current associated schedule object and its triggers.
		if workflow.ScheduleID != nil {
			if deleteScheduleTriggersErr := tx.Where("schedule_id = ?", *workflow.ScheduleID).Delete(&db.WorkflowTrigger{}).Error; deleteScheduleTriggersErr != nil {
				api.Logger.ErrorContext(c, "Error deleting schedule triggers", "error", deleteScheduleTriggersErr)
				return deleteScheduleTriggersErr
			}
			if deleteScheduleErr := tx.Delete(&db.Schedule{}, *workflow.ScheduleID).Error; deleteScheduleErr != nil {
				api.Logger.ErrorContext(c, "Error deleting schedule", "error", deleteScheduleErr)
				return deleteScheduleErr
			}
		}

		// Update the workflow record with the new schedule object.
		workflow.ScheduleID = &newSchedule.ID
		workflow.Schedule = newSchedule
		if updateWorkflowErr := tx.Save(workflow).Error; updateWorkflowErr != nil {
			api.Logger.ErrorContext(c, "Error updating workflow", "error", updateWorkflowErr)
			return updateWorkflowErr
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
		return err
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
		return deleteWorkflowErr
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
		return nil, err
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
	if uint(newOwnerID) == user.ID {
		return nil, ErrNewOwnerInvalid
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, isUserInWorkspaceErr := api.DB.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
	if isUserInWorkspaceErr != nil {
		api.Logger.ErrorContext(c, "Error checking if user is in workspace", "error", isUserInWorkspaceErr)
		return nil, isUserInWorkspaceErr
	}
	if !inWorkspace {
		return nil, ErrNewOwnerInvalid
	}

	// Update the workflow record.
	workflow.OwnerID = uint(newOwnerID)
	if updateWorkflowErr := api.DB.Save(&workflow).Error; updateWorkflowErr != nil {
		api.Logger.ErrorContext(c, "Error updating workflow", "error", updateWorkflowErr)
		return nil, updateWorkflowErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Workflow ownership transferred to %s", workflow.Owner.Email),
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
		return nil, err
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
		return nil, err
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
			return err
		}
	}
	if workflow.Import != nil {
		if err := tx.Delete(&db.ImportWorkflowable{}, workflow.Import.ID).Error; err != nil {
			return err
		}
	}
	if workflow.Export != nil {
		if err := tx.Delete(&db.ExportWorkflowable{}, workflow.Export.ID).Error; err != nil {
			return err
		}
	}
	if workflow.Pipeline != nil {
		if err := tx.Delete(&db.PipelineWorkflowable{}, workflow.Pipeline.ID).Error; err != nil {
			return err
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
		return nil, nil, nil, nil, fmt.Errorf("invalid workflowable configuration: %w", marshalErr)
	}
	if unmarshalErr := json.Unmarshal(jsonBytes, &wflConfig); unmarshalErr != nil {
		return nil, nil, nil, nil, fmt.Errorf("invalid workflowable configuration: %w", unmarshalErr)
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
		pipelineWorkflowable, err = api.createPipelineWorkflowable(txDB, workspace, &wflConfig)
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
		return nil, nil, err
	}

	// Find the connection by ID (using transaction connection)
	connectionID, err := api.SQIDManager.Decode("connections", wflConfig.ConnectionID)
	if err != nil {
		return nil, nil, err
	}
	conn, err := txDB.GetConnectionByID(uint(connectionID))
	if err != nil {
		return nil, nil, err
	}

	// Ensure FieldMappings is initialized as empty slice if nil to avoid PostgreSQL JSONB NULL error
	fieldMappings := wflConfig.FieldMappings
	if fieldMappings == nil {
		fieldMappings = []irminmodels.FieldMapping{}
	}

	// Trim only leading slash from the paths
	trimmedImportToRepositoryPath := strings.TrimLeft(wflConfig.ImportToRepositoryPath, "/")
	trimmedExportToConnectionPath := strings.TrimLeft(wflConfig.ExportToConnectionPath, "/")
	trimmedImportFromConnectionPaths := make([]string, len(wflConfig.ImportFromConnectionPaths))
	for i, path := range wflConfig.ImportFromConnectionPaths {
		trimmedImportFromConnectionPaths[i] = strings.TrimLeft(path, "/")
	}
	trimmedExportFromRepositoryPaths := make([]string, len(wflConfig.ExportFromRepositoryPaths))
	for i, path := range wflConfig.ExportFromRepositoryPaths {
		trimmedExportFromRepositoryPaths[i] = strings.TrimLeft(path, "/")
	}

	// Handle import workflowable case
	if workflowableType == irminmodels.WorkflowableTypeImport {
		// Create import workflowable
		importWorkflowable := &db.ImportWorkflowable{
			ConnectionID:              conn.ID,
			ImportFromConnectionPaths: trimmedImportFromConnectionPaths,
			RepositoryID:              repo.ID,
			RepositoryBranch:          wflConfig.RepositoryBranch,
			ImportToRepositoryPath:    trimmedImportToRepositoryPath,
			FieldMappings:             fieldMappings,
		}
		if createImportWorkflowableErr := txDB.Create(importWorkflowable).Error; createImportWorkflowableErr != nil {
			return nil, nil, createImportWorkflowableErr
		}
		return importWorkflowable, nil, nil
	}

	// Handle export workflowable case
	exportWorkflowable := &db.ExportWorkflowable{
		ConnectionID:              conn.ID,
		ExportToConnectionPath:    trimmedExportToConnectionPath,
		RepositoryID:              repo.ID,
		RepositoryBranch:          wflConfig.RepositoryBranch,
		ExportFromRepositoryPaths: trimmedExportFromRepositoryPaths,
		FieldMappings:             fieldMappings,
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

	// Process input data (using transaction connection)
	var inputData []db.ActionWorkflowableInput
	for _, inputObject := range config.Input {
		repository, getRepoErr := txDB.GetRepositoryBySlugAndWorkspaceID(
			inputObject.Repository,
			workspace.ID,
		)
		if getRepoErr != nil {
			return nil, getRepoErr
		}

		path := strings.TrimPrefix(inputObject.RepositoryPath, "/")
		inputData = append(inputData, db.ActionWorkflowableInput{
			RepositoryID:   repository.ID,
			RepositoryRef:  inputObject.RepositoryRef,
			RepositoryPath: path,
		})
	}

	// Handle repository if specified (using transaction connection)
	var repository *db.Repository
	if config.Repository != "" {
		var getRepositoryBySlugAndWorkspaceIDErr error
		repository, getRepositoryBySlugAndWorkspaceIDErr = txDB.GetRepositoryBySlugAndWorkspaceID(
			config.Repository,
			workspace.ID,
		)
		if getRepositoryBySlugAndWorkspaceIDErr != nil {
			return nil, getRepositoryBySlugAndWorkspaceIDErr
		}
	}

	// Create workflowable
	var workflowable db.ActionWorkflowable
	if repository != nil {
		// Validate that required repository result fields are provided
		if config.ResultsRepositoryBranch == nil {
			return nil, errors.New("results repository branch is required when repository is specified")
		}
		if config.ResultsRepositoryPath == nil {
			return nil, errors.New("results repository path is required when repository is specified")
		}

		repositoryID := repository.ID
		branch := *config.ResultsRepositoryBranch
		path := strings.TrimPrefix(*config.ResultsRepositoryPath, "/")

		workflowable = db.ActionWorkflowable{
			Executable:              config.Executable,
			ResultsRepositoryID:     &repositoryID,
			ResultsRepositoryBranch: &branch,
			ResultsRepositoryPath:   &path,
			Inputs:                  inputData,
		}
	} else {
		workflowable = db.ActionWorkflowable{
			Executable: config.Executable,
			Inputs:     inputData,
		}
	}

	if createActionWorkflowableErr := txDB.Create(&workflowable).Error; createActionWorkflowableErr != nil {
		return nil, createActionWorkflowableErr
	}
	return &workflowable, nil
}

// createPipelineWorkflowable is a helper function to create pipeline workflowable.
func (api *APIServices) createPipelineWorkflowable(
	txDB *db.Database,
	workspace *db.Workspace,
	config *irminmodels.Workflowable,
) (*db.PipelineWorkflowable, error) {
	if config == nil {
		return nil, errors.New("pipeline configuration is required")
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

		err := api.processStageByType(txDB, &newStage, stage, workspace)
		if err != nil {
			return nil, err
		}

		stages = append(stages, newStage)
	}

	// Create workflowable
	pipelineWorkflowable := &db.PipelineWorkflowable{
		Live:   config.Live,
		Stages: stages,
	}
	if createPipelineWorkflowableErr := txDB.Create(pipelineWorkflowable).Error; createPipelineWorkflowableErr != nil {
		return nil, createPipelineWorkflowableErr
	}
	return pipelineWorkflowable, nil
}

// processStageByType processes a stage based on its type.
func (api *APIServices) processStageByType(
	txDB *db.Database,
	newStage *db.PipelineStage,
	stage irminmodels.PipelineStage,
	workspace *db.Workspace,
) error {
	switch stage.Type {
	case irminmodels.PipelineStageTypeAction:
		return api.processActionStage(newStage, stage)
	case irminmodels.PipelineStageTypeConnection:
		return api.processConnectionStage(txDB, newStage, stage)
	case irminmodels.PipelineStageTypeRepository:
		return api.processRepositoryStage(txDB, newStage, stage, workspace)
	default:
		return fmt.Errorf("invalid stage type: %s", stage.Type)
	}
}

// processActionStage processes an action stage.
func (api *APIServices) processActionStage(newStage *db.PipelineStage, stage irminmodels.PipelineStage) error {
	newStage.Type = db.PipelineStageTypeAction
	if stage.Executable != nil {
		executable := strings.TrimPrefix(*stage.Executable, "/")
		newStage.Executable = &executable
	}
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

func (api *APIServices) createWorkflowSchedule(tx *gorm.DB, schedule *db.Schedule) error {
	if createScheduleErr := tx.Create(schedule).Error; createScheduleErr != nil {
		return createScheduleErr
	}
	return nil
}
