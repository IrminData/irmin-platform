package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

// ---- API endpoint controllers ----

// WorkflowsIndex shows all workflows for a workspace.
func (api *APIControllers) WorkflowsIndex(c fiber.Ctx) error {
	// Get the dictionary and workspace from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !dictOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the filters from the query string.
	query, err := utils.ParseQueryParams(c, nil, []string{"type"})
	if err != nil {
		api.Logger.Error("Error parsing query params", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	var workflows []db.Workflow
	if query["type"] != "" {
		// Get the workflows for the workspace filtered by type.
		workflows, err = api.DB.GetWorkflowsOfTypeByWorkspaceID(workspace.ID, db.WorkflowableType(query["type"]))
		if err != nil {
			api.Logger.Error("Error retrieving workflows", "error", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "error_occurred")},
			})
		}
	} else {
		// Get the workflows for the workspace.
		workflows, err = api.DB.GetWorkflowsByWorkspaceID(workspace.ID)
		if err != nil {
			api.Logger.Error("Error retrieving workflows", "error", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "error_occurred")},
			})
		}
	}

	// Structure the response.
	var workflowsResponse []irminmodels.Workflow
	for _, workflow := range workflows {
		workflowResponse, formatWorkflowResponseErr := formatter.FormatWorkflowResponse(
			api.DB,
			&workflow,
			api.SQIDManager,
		)
		if formatWorkflowResponseErr != nil {
			api.Logger.Error("Error getting workflow response", "error", formatWorkflowResponseErr)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "error_occurred")},
			})
		}
		workflowsResponse = append(workflowsResponse, *workflowResponse)
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: workflowsResponse,
	})
}

// WorkflowsShow shows a workflow.
func (api *APIControllers) WorkflowsShow(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workflow, workflowOk := c.Locals("workflow").(*db.Workflow)

	if !dictOk || !workflowOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the workflow response.
	workflowResponse, formatWorkflowResponseErr := formatter.FormatWorkflowResponse(api.DB, workflow, api.SQIDManager)
	if formatWorkflowResponseErr != nil {
		api.Logger.Error("Error getting workflow response", "error", formatWorkflowResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: workflowResponse,
	})
}

// WorkflowsUpdate updates a workflow.
func (api *APIControllers) WorkflowsUpdate(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workflow, workflowOk := c.Locals("workflow").(*db.Workflow)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !dictOk || !userOk || !workflowOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the request body - all fields are optional during update
	fields, err := utils.ParseFormFields(c, nil, []string{"name", "description", "documentation"})
	if err != nil {
		api.Logger.Error("Error parsing form fields", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Only update fields that were provided
	if fields["name"] != "" {
		workflow.Name = fields["name"]
	}
	if fields["description"] != "" {
		workflow.Description = fields["description"]
	}
	if fields["documentation"] != "" {
		workflow.Documentation = fields["documentation"]
	}
	if updateWorkflowErr := api.DB.Save(&workflow).Error; updateWorkflowErr != nil {
		api.Logger.Error("Error updating workflow", "error", updateWorkflowErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the workflow response.
	workflowResponse, formatWorkflowResponseErr := formatter.FormatWorkflowResponse(
		api.DB,
		workflow,
		api.SQIDManager,
	)
	if formatWorkflowResponseErr != nil {
		api.Logger.Error("Error getting workflow response", "error", formatWorkflowResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: "Workflow settings updated",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workflow_updated"),
		Data:    workflowResponse,
	})
}

// WorkflowsStore creates a new workflow.
func (api *APIControllers) WorkflowsStore(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)

	if !dictOk || !workspaceOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the request body
	fields, err := utils.ParseFormFields(
		c,
		[]string{"type", "name"},
		[]string{"description", "documentation"},
	)
	if err != nil {
		api.Logger.Error("Error parsing form fields", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Create variables to store all possible workflowable objects.
	var importWorkflowable *db.ImportWorkflowable
	var exportWorkflowable *db.ExportWorkflowable
	var actionWorkflowable *db.ActionWorkflowable
	var pipelineWorkflowable *db.PipelineWorkflowable
	var workflow db.Workflow

	// Start a transaction for all database operations
	txErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Create workflowable based on type
		if createWorkflowableErr := api.createWorkflowableByType(c, tx, workspace, fields["type"], &importWorkflowable, &exportWorkflowable, &actionWorkflowable, &pipelineWorkflowable); createWorkflowableErr != nil {
			return createWorkflowableErr
		}

		// Parse and create schedule
		schedule, parseScheduleErr := lib.ParseScheduleFromRequest(c, api.DB, *workspace, api.SQIDManager)
		if parseScheduleErr != nil {
			return parseScheduleErr
		}
		if createScheduleErr := tx.Create(schedule).Error; createScheduleErr != nil {
			return createScheduleErr
		}

		// Create workflow record
		workflow = api.createWorkflowRecord(
			fields,
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
		api.Logger.Error("Error creating workflow", "error", txErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the workflow response
	workflowResponse, err := formatter.FormatWorkflowResponse(api.DB, &workflow, api.SQIDManager)
	if err != nil {
		api.Logger.Error("Error getting workflow response", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: "Workflow created",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	return utils.WriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workflow_created"),
		Data:    workflowResponse,
	})
}

// WorkflowableUpdate updates the workflowable of a workflow.
func (api *APIControllers) WorkflowableUpdate(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	workflow, workflowOk := c.Locals("workflow").(*db.Workflow)

	if !dictOk || !userOk || !workspaceOk || !workflowOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Create variables to store all possible workflowable objects.
	var importWorkflowable *db.ImportWorkflowable
	var exportWorkflowable *db.ExportWorkflowable
	var actionWorkflowable *db.ActionWorkflowable
	var pipelineWorkflowable *db.PipelineWorkflowable

	// Start a transaction for all database operations
	txErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Create new workflowable based on type
		if err := api.createWorkflowableByType(c, tx, workspace, string(workflow.Type), &importWorkflowable, &exportWorkflowable, &actionWorkflowable, &pipelineWorkflowable); err != nil {
			return err
		}

		// Delete existing workflowable
		if err := api.deleteExistingWorkflowable(tx, workflow); err != nil {
			return err
		}

		// Update workflow with new workflowable
		api.updateWorkflowWithWorkflowable(
			workflow,
			importWorkflowable,
			exportWorkflowable,
			actionWorkflowable,
			pipelineWorkflowable,
		)
		if err := tx.Save(workflow).Error; err != nil {
			return err
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
		api.Logger.Error("Error updating workflow", "error", txErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the workflow response
	workflowResponse, err := formatter.FormatWorkflowResponse(api.DB, workflow, api.SQIDManager)
	if err != nil {
		api.Logger.Error("Error getting workflow response", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: "Workflow workflowable configuration updated",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workflow_updated"),
		Data:    workflowResponse,
	})
}

// ScheduleUpdate updates the schedule of a workflow.
func (api *APIControllers) ScheduleUpdate(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)
	workflow, workflowOk := c.Locals("workflow").(*db.Workflow)

	if !dictOk || !userOk || !workspaceOk || !workflowOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the schedule object from the request body.
	schedule, err := lib.ParseScheduleFromRequest(c, api.DB, *workspace, api.SQIDManager)
	if err != nil {
		api.Logger.Error("Error creating schedule object", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Start a transaction.
	txErr := api.DB.Transaction(func(tx *gorm.DB) error {
		newSchedule := schedule
		// Create the schedule in the database.
		if createScheduleErr := tx.Create(&newSchedule).Error; createScheduleErr != nil {
			api.Logger.Error("Error creating schedule", "error", createScheduleErr)
			return createScheduleErr
		}

		// Delete the current associated schedule object and its triggers.
		if workflow.ScheduleID != nil {
			if deleteScheduleTriggersErr := tx.Where("schedule_id = ?", workflow.ScheduleID).Delete(&db.WorkflowTrigger{}).Error; deleteScheduleTriggersErr != nil {
				api.Logger.Error("Error deleting schedule triggers", "error", deleteScheduleTriggersErr)
				return deleteScheduleTriggersErr
			}
			if deleteScheduleErr := tx.Delete(&db.Schedule{}, workflow.ScheduleID).Error; deleteScheduleErr != nil {
				api.Logger.Error("Error deleting schedule", "error", deleteScheduleErr)
				return deleteScheduleErr
			}
		}

		// Update the workflow record with the new schedule object.
		workflow.ScheduleID = &newSchedule.ID
		workflow.Schedule = newSchedule
		if updateWorkflowErr := tx.Save(workflow).Error; updateWorkflowErr != nil {
			api.Logger.Error("Error updating workflow", "error", updateWorkflowErr)
			return updateWorkflowErr
		}

		return nil
	})
	if txErr != nil {
		api.Logger.Error("Error updating workflow schedule", "error", txErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the workflow response.
	workflowResponse, err := formatter.FormatWorkflowResponse(api.DB, workflow, api.SQIDManager)
	if err != nil {
		api.Logger.Error("Error getting workflow response", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: "Workflow schedule updated",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "schedule_updated"),
		Data:    workflowResponse,
	})
}

// WorkflowsDestroy destroys a workflow.
func (api *APIControllers) WorkflowsDestroy(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	workflow, workflowOk := c.Locals("workflow").(*db.Workflow)

	if !dictOk || !userOk || !workspaceOk || !workflowOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Delete the workflow and all related records
	deleteWorkflowErr := api.DB.DeleteWorkflow(workflow.ID)
	if deleteWorkflowErr != nil {
		api.Logger.Error("Error deleting workflow", "error", deleteWorkflowErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: "Workflow deleted",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workflow_deleted"),
	})
}

// TransferWorkflowOwnership transfers the ownership of a workflow.
func (api *APIControllers) TransferWorkflowOwnership(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	workflow, workflowOk := c.Locals("workflow").(*db.Workflow)

	if !dictOk || !userOk || !workspaceOk || !workflowOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the request body
	fields, parseFormFieldsErr := utils.ParseFormFields(c, []string{"new_owner_id"}, nil)
	if parseFormFieldsErr != nil {
		api.Logger.Error("Error parsing form fields", "error", parseFormFieldsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Decode the new owner ID.
	newOwnerID, decodeSqidsErr := api.SQIDManager.Decode("users", fields["new_owner_id"])
	if decodeSqidsErr != nil {
		api.Logger.Error("Error decoding new owner sqid", "error", decodeSqidsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, isUserInWorkspaceErr := api.DB.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
	if isUserInWorkspaceErr != nil {
		api.Logger.Error("Error checking if user is in workspace", "error", isUserInWorkspaceErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "new_owner_invalid")},
		})
	}
	if !inWorkspace {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "new_owner_invalid")},
		})
	}

	// Update the workflow record.
	workflow.OwnerID = uint(newOwnerID)
	if updateWorkflowErr := api.DB.Save(&workflow).Error; updateWorkflowErr != nil {
		api.Logger.Error("Error updating workflow", "error", updateWorkflowErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the workflow response.
	workflowResponse, formatWorkflowResponseErr := formatter.FormatWorkflowResponse(
		api.DB,
		workflow,
		api.SQIDManager,
	)
	if formatWorkflowResponseErr != nil {
		api.Logger.Error("Error getting workflow response", "error", formatWorkflowResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Workflow ownership transferred to %s", workflow.Owner.Email),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workflow_ownership_transferred"),
		Data:    workflowResponse,
	})
}

// PauseWorkflow pauses a workflow.
func (api *APIControllers) PauseWorkflow(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	workflow, workflowOk := c.Locals("workflow").(*db.Workflow)

	if !dictOk || !userOk || !workspaceOk || !workflowOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Update the workflow record to pause it.
	workflow.Paused = true
	if updateWorkflowErr := api.DB.Save(&workflow).Error; updateWorkflowErr != nil {
		api.Logger.Error("Error pausing workflow", "error", updateWorkflowErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the workflow response.
	workflowResponse, formatWorkflowResponseErr := formatter.FormatWorkflowResponse(
		api.DB,
		workflow,
		api.SQIDManager,
	)
	if formatWorkflowResponseErr != nil {
		api.Logger.Error("Error getting workflow response", "error", formatWorkflowResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: "Workflow paused",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workflow_stopped"),
		Data:    workflowResponse,
	})
}

// StartWorkflow starts a workflow.
func (api *APIControllers) StartWorkflow(c fiber.Ctx) error {
	// Get the dictionary and workflow from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	workflow, workflowOk := c.Locals("workflow").(*db.Workflow)

	if !dictOk || !userOk || !workspaceOk || !workflowOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Check if the workflow is already running.
	if !workflow.Paused {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "workflow_already_running")},
		})
	}

	// Update the workflow record to start it.
	workflow.Paused = false
	if updateWorkflowErr := api.DB.Save(&workflow).Error; updateWorkflowErr != nil {
		api.Logger.Error("Error starting workflow", "error", updateWorkflowErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the workflow response.
	workflowResponse, formatWorkflowResponseErr := formatter.FormatWorkflowResponse(
		api.DB,
		workflow,
		api.SQIDManager,
	)
	if formatWorkflowResponseErr != nil {
		api.Logger.Error("Error getting workflow response", "error", formatWorkflowResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: "Workflow started",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workflow_started"),
		Data:    workflowResponse,
	})
}

// ---- Helper functions ----

// createWorkflowRecord is a helper function to create a workflow record.
func (api *APIControllers) createWorkflowRecord(
	fields map[string]string,
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
			Name:          fields["name"],
			Description:   fields["description"],
			Documentation: fields["documentation"],
			Type:          db.WorkflowableTypeImport,
			OwnerID:       user.ID,
			WorkspaceID:   workspace.ID,
			ScheduleID:    &schedule.ID,
			ImportID:      &importWorkflowable.ID,
		}
	case exportWorkflowable != nil:
		return db.Workflow{
			Name:          fields["name"],
			Description:   fields["description"],
			Documentation: fields["documentation"],
			Type:          db.WorkflowableTypeExport,
			OwnerID:       user.ID,
			WorkspaceID:   workspace.ID,
			ScheduleID:    &schedule.ID,
			ExportID:      &exportWorkflowable.ID,
		}
	case actionWorkflowable != nil:
		return db.Workflow{
			Name:          fields["name"],
			Description:   fields["description"],
			Documentation: fields["documentation"],
			Type:          db.WorkflowableTypeAction,
			OwnerID:       user.ID,
			WorkspaceID:   workspace.ID,
			ScheduleID:    &schedule.ID,
			ActionID:      &actionWorkflowable.ID,
		}
	case pipelineWorkflowable != nil:
		return db.Workflow{
			Name:          fields["name"],
			Description:   fields["documentation"],
			Documentation: fields["documentation"],
			Type:          db.WorkflowableTypePipeline,
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
func (api *APIControllers) deleteExistingWorkflowable(tx *gorm.DB, workflow *db.Workflow) error {
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
func (api *APIControllers) updateWorkflowWithWorkflowable(
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
func (api *APIControllers) createWorkflowableByType(
	c fiber.Ctx,
	tx *gorm.DB,
	workspace *db.Workspace,
	workflowableType string,
	importWorkflowable **db.ImportWorkflowable,
	exportWorkflowable **db.ExportWorkflowable,
	actionWorkflowable **db.ActionWorkflowable,
	pipelineWorkflowable **db.PipelineWorkflowable,
) error {
	var err error
	switch db.WorkflowableType(workflowableType) {
	case db.WorkflowableTypeImport:
		*importWorkflowable, _, err = api.createImportExportWorkflowable(c, tx, workspace, db.WorkflowableTypeImport)
	case db.WorkflowableTypeExport:
		_, *exportWorkflowable, err = api.createImportExportWorkflowable(c, tx, workspace, db.WorkflowableTypeExport)
	case db.WorkflowableTypeAction:
		*actionWorkflowable, err = api.createActionWorkflowable(c, tx, workspace)
	case db.WorkflowableTypePipeline:
		*pipelineWorkflowable, err = api.createPipelineWorkflowable(c, tx, workspace)
	default:
		return fmt.Errorf("invalid workflow type: %s", workflowableType)
	}
	return err
}

// createImportExportWorkflowable is a helper function to create import or export workflowable.
func (api *APIControllers) createImportExportWorkflowable(
	c fiber.Ctx,
	tx *gorm.DB,
	workspace *db.Workspace,
	workflowableType db.WorkflowableType,
) (*db.ImportWorkflowable, *db.ExportWorkflowable, error) {
	// Parse additional request body fields
	workflowableFields, parseErr := utils.ParseFormFields(
		c,
		[]string{"connection", "repository", "branch"},
		[]string{"connection_path", "path"},
	)
	if parseErr != nil {
		return nil, nil, parseErr
	}

	// Find the repository by slug
	repository, err := api.DB.GetRepositoryBySlugAndWorkspaceID(
		workflowableFields["repository"],
		workspace.ID,
	)
	if err != nil {
		return nil, nil, err
	}

	// Find the connection by ID
	connectionID, err := api.SQIDManager.Decode("connections", workflowableFields["connection"])
	if err != nil {
		return nil, nil, err
	}
	connection, err := api.DB.GetConnectionByID(uint(connectionID))
	if err != nil {
		return nil, nil, err
	}

	// Trim only leading slash from the path and the connection path
	path := strings.TrimLeft(workflowableFields["path"], "/")
	connectionPath := strings.TrimLeft(workflowableFields["connection_path"], "/")

	if workflowableType == db.WorkflowableTypeImport {
		importWorkflowable := &db.ImportWorkflowable{
			ConnectionID:   connection.ID,
			ConnectionPath: connectionPath,
			RepositoryID:   repository.ID,
			Branch:         workflowableFields["branch"],
			Path:           path,
		}
		if createImportWorkflowableErr := tx.Create(importWorkflowable).Error; createImportWorkflowableErr != nil {
			return nil, nil, createImportWorkflowableErr
		}
		return importWorkflowable, nil, nil
	}

	// Handle export workflowable case
	exportWorkflowable := &db.ExportWorkflowable{
		ConnectionID:   connection.ID,
		ConnectionPath: connectionPath,
		RepositoryID:   repository.ID,
		Branch:         workflowableFields["branch"],
		Path:           path,
	}
	if createExportWorkflowableErr := tx.Create(exportWorkflowable).Error; createExportWorkflowableErr != nil {
		return nil, nil, createExportWorkflowableErr
	}
	return nil, exportWorkflowable, nil
}

// createActionWorkflowable is a helper function to create action workflowable.
func (api *APIControllers) createActionWorkflowable(
	c fiber.Ctx,
	tx *gorm.DB,
	workspace *db.Workspace,
) (*db.ActionWorkflowable, error) {
	// Parse additional request body fields
	workflowableFields, err := utils.ParseFormFields(
		c,
		[]string{"executable"},
		[]string{"repository", "branch", "path"},
	)
	if err != nil {
		return nil, err
	}

	// Parse input objects
	inputObjects, err := utils.ParseArrayFormFields(c, "input")
	if err != nil {
		return nil, err
	}

	// Process input data
	var inputData []db.ActionWorkflowableInput
	for _, inputObject := range inputObjects {
		repository, getRepoErr := api.DB.GetRepositoryBySlugAndWorkspaceID(
			inputObject["repository"],
			workspace.ID,
		)
		if getRepoErr != nil {
			return nil, getRepoErr
		}

		path := strings.TrimPrefix(inputObject["path"], "/")
		inputData = append(inputData, db.ActionWorkflowableInput{
			RepositoryID: repository.ID,
			Ref:          inputObject["ref"],
			Path:         path,
		})
	}

	// Handle repository if specified
	var repository *db.Repository
	if workflowableFields["repository"] != "" {
		var getRepositoryBySlugAndWorkspaceIDErr error
		repository, getRepositoryBySlugAndWorkspaceIDErr = api.DB.GetRepositoryBySlugAndWorkspaceID(
			workflowableFields["repository"],
			workspace.ID,
		)
		if getRepositoryBySlugAndWorkspaceIDErr != nil {
			return nil, getRepositoryBySlugAndWorkspaceIDErr
		}
	}

	// Create workflowable
	var workflowable db.ActionWorkflowable
	if repository != nil {
		repositoryID := repository.ID
		branch := workflowableFields["branch"]
		path := strings.TrimPrefix(workflowableFields["path"], "/")

		workflowable = db.ActionWorkflowable{
			Executable:   workflowableFields["executable"],
			RepositoryID: &repositoryID,
			Branch:       &branch,
			Path:         &path,
			Inputs:       inputData,
		}
	} else {
		workflowable = db.ActionWorkflowable{
			Executable: workflowableFields["executable"],
		}
	}

	if createActionWorkflowableErr := tx.Create(&workflowable).Error; createActionWorkflowableErr != nil {
		return nil, createActionWorkflowableErr
	}
	return &workflowable, nil
}

// createPipelineWorkflowable is a helper function to create pipeline workflowable.
func (api *APIControllers) createPipelineWorkflowable(
	c fiber.Ctx,
	tx *gorm.DB,
	workspace *db.Workspace,
) (*db.PipelineWorkflowable, error) {
	// Parse additional request body fields
	workflowableFields, err := utils.ParseFormFields(c, nil, []string{"live"})
	if err != nil {
		return nil, err
	}

	// Parse stages
	requestStages, err := utils.ParseArrayFormFields(c, "stage")
	if err != nil {
		return nil, err
	}

	// Process stages
	var stages []db.PipelineStage
	for orderSequence, stage := range requestStages {
		newStage := db.PipelineStage{
			OrderSequence: orderSequence,
			Description:   stage["description"],
			Write:         stage["write"] == trueString,
			Read:          stage["read"] == trueString,
		}

		switch stage["type"] {
		case "action":
			newStage.Type = db.PipelineStageTypeAction
			executable := strings.TrimPrefix(stage["executable"], "/")
			newStage.Executable = &executable
		case "connection":
			newStage.Type = db.PipelineStageTypeConnection
			parsedConnID, parseConnIDErr := api.SQIDManager.Decode("connections", stage["connection"])
			if parseConnIDErr != nil {
				return nil, parseConnIDErr
			}
			connection, getConnectionByIDErr := api.DB.GetConnectionByID(uint(parsedConnID))
			if getConnectionByIDErr != nil {
				return nil, getConnectionByIDErr
			}
			writePath := strings.TrimPrefix(stage["connection_write_path"], "/")
			readPath := strings.TrimPrefix(stage["connection_read_path"], "/")
			newStage.ConnectionID = &connection.ID
			newStage.ConnectionWritePath = &writePath
			newStage.ConnectionReadPath = &readPath
		case "repository":
			newStage.Type = db.PipelineStageTypeRepository
			repository, getRepositoryBySlugAndWorkspaceIDErr := api.DB.GetRepositoryBySlugAndWorkspaceID(
				stage["repository"],
				workspace.ID,
			)
			if getRepositoryBySlugAndWorkspaceIDErr != nil {
				return nil, getRepositoryBySlugAndWorkspaceIDErr
			}
			branch := stage["branch"]
			path := strings.TrimLeft(stage["path"], "/")
			newStage.RepositoryID = &repository.ID
			newStage.RepositoryBranch = &branch
			newStage.RepositoryPath = &path
		default:
			return nil, fmt.Errorf("invalid stage type: %s", stage["type"])
		}
		stages = append(stages, newStage)
	}

	// Create workflowable
	live := workflowableFields["live"] == trueString
	pipelineWorkflowable := &db.PipelineWorkflowable{
		Live:   live,
		Stages: stages,
	}
	if createPipelineWorkflowableErr := tx.Create(pipelineWorkflowable).Error; createPipelineWorkflowableErr != nil {
		return nil, createPipelineWorkflowableErr
	}
	return pipelineWorkflowable, nil
}
