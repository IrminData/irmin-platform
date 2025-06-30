package controllers

import (
	"encoding/json"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/utils"
	"strings"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

// WorkflowsIndex shows all workflows for a workspace.
func (api *APIControllers) WorkflowsIndex(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
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
		workflows, err = api.DB.GetWorkflowsOfTypeByWorkspaceID(
			workspace.ID,
			irminmodels.WorkflowableType(query["type"]),
		)
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

	// Filter workflows based on user permissions
	filteredWorkflows, err := lib.IsAllowedFilter(
		api.permissionService,
		user,
		workspace,
		db.PolicyResourceWorkflow,
		db.PolicyActionRead,
		workflows,
		func(w db.Workflow) uint { return w.ID },
	)
	if err != nil {
		api.Logger.Error("Error filtering workflows by permissions", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Create a wrapper function that adapts FormatWorkflowResponse to the expected signature
	formatWorkflow := func(workflow *db.Workflow, sqidManager *utils.SQIDManager) (*irminmodels.Workflow, error) {
		return formatter.FormatWorkflowResponse(api.DB, workflow, sqidManager)
	}

	// Format the response using FormatIndexResponse
	workflowsResponse, err := formatter.FormatIndexResponse(
		filteredWorkflows,
		formatWorkflow,
		api.SQIDManager,
	)
	if err != nil {
		api.Logger.Error("Error formatting workflow response", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: workflowsResponse,
	})
}

// WorkflowsShow shows a workflow.
func (api *APIControllers) WorkflowsShow(c fiber.Ctx) error {
	_, dict, _, _, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the workflow from locals
	workflow, workflowOk := c.Locals("workflow").(*db.Workflow)
	if !workflowOk {
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
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the workflow from locals
	workflow, workflowOk := c.Locals("workflow").(*db.Workflow)
	if !workflowOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse JSON request body
	var req irmincore.UpdateWorkflowRequest
	if bindErr := c.Bind().JSON(&req); bindErr != nil {
		api.Logger.Error("Error parsing JSON request", "error", bindErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Only update fields that were provided
	if req.Name != "" {
		workflow.Name = req.Name
	}
	if req.Description != "" {
		workflow.Description = req.Description
	}
	if req.Documentation != "" {
		workflow.Documentation = req.Documentation
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
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse JSON request body
	var req irmincore.WorkflowRequest
	if bindErr := c.Bind().JSON(&req); bindErr != nil {
		api.Logger.Error("Error parsing JSON request", "error", bindErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Validate required fields
	if req.Type == "" || req.Name == "" {
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
		var createWorkflowableErr error
		importWorkflowable, exportWorkflowable, actionWorkflowable, pipelineWorkflowable, createWorkflowableErr = api.createWorkflowableByType(
			tx,
			workspace,
			&req,
		)
		if createWorkflowableErr != nil {
			return createWorkflowableErr
		}

		// Parse and create schedule
		schedule, parseScheduleErr := lib.ParseScheduleFromData(&req.Schedule, api.DB, *workspace, api.SQIDManager)
		if parseScheduleErr != nil {
			return parseScheduleErr
		}
		if createScheduleErr := tx.Create(schedule).Error; createScheduleErr != nil {
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
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the workflow from locals
	workflow, workflowOk := c.Locals("workflow").(*db.Workflow)
	if !workflowOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Create variables to store all possible workflowable objects.
	var importWorkflowable *db.ImportWorkflowable
	var exportWorkflowable *db.ExportWorkflowable
	var actionWorkflowable *db.ActionWorkflowable
	var pipelineWorkflowable *db.PipelineWorkflowable

	// Start a transaction for all database operations
	txErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Create new workflowable based on type - parse request for workflowable update
		var workflowableReq irmincore.WorkflowRequest
		if bindErr := c.Bind().JSON(&workflowableReq); bindErr != nil {
			return bindErr
		}
		workflowableReq.Type = workflow.Type // Use existing workflow type
		var createWorkflowableErr error
		importWorkflowable, exportWorkflowable, actionWorkflowable, pipelineWorkflowable, createWorkflowableErr = api.createWorkflowableByType(
			tx,
			workspace,
			&workflowableReq,
		)
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
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the workflow from locals
	workflow, workflowOk := c.Locals("workflow").(*db.Workflow)
	if !workflowOk {
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
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the workflow from locals
	workflow, workflowOk := c.Locals("workflow").(*db.Workflow)
	if !workflowOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Delete the workflow and all related records
	deleteWorkflowErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return api.DB.DeleteWorkflow(tx, workflow.ID)
	})
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
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the workflow from locals
	workflow, workflowOk := c.Locals("workflow").(*db.Workflow)
	if !workflowOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse JSON request body
	var req irmincore.TransferWorkflowOwnershipRequest
	if bindErr := c.Bind().JSON(&req); bindErr != nil {
		api.Logger.Error("Error parsing JSON request", "error", bindErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Validate required fields
	if req.NewOwnerID == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Decode the new owner ID.
	newOwnerID, decodeSqidsErr := api.SQIDManager.Decode("users", req.NewOwnerID)
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
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the workflow from locals
	workflow, workflowOk := c.Locals("workflow").(*db.Workflow)
	if !workflowOk {
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
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the workflow from locals
	workflow, workflowOk := c.Locals("workflow").(*db.Workflow)
	if !workflowOk {
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
	tx *gorm.DB,
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
			tx,
			workspace,
			&wflConfig,
			irminmodels.WorkflowableTypeImport,
		)
	case irminmodels.WorkflowableTypeExport:
		_, exportWorkflowable, err = api.createImportExportWorkflowable(
			tx,
			workspace,
			&wflConfig,
			irminmodels.WorkflowableTypeExport,
		)
	case irminmodels.WorkflowableTypeAction:
		actionWorkflowable, err = api.createActionWorkflowable(tx, workspace, &wflConfig)
	case irminmodels.WorkflowableTypePipeline:
		pipelineWorkflowable, err = api.createPipelineWorkflowable(tx, workspace, &wflConfig)
	default:
		return nil, nil, nil, nil, fmt.Errorf("invalid workflow type: %s", req.Type)
	}
	return importWorkflowable, exportWorkflowable, actionWorkflowable, pipelineWorkflowable, err
}

// createImportExportWorkflowable is a helper function to create import or export workflowable.
func (api *APIControllers) createImportExportWorkflowable(
	tx *gorm.DB,
	workspace *db.Workspace,
	wflConfig *irminmodels.Workflowable,
	workflowableType irminmodels.WorkflowableType,
) (*db.ImportWorkflowable, *db.ExportWorkflowable, error) {
	// Validate config type matches expected workflowableType
	if wflConfig.Type != workflowableType {
		return nil, nil, fmt.Errorf("%s configuration is required", workflowableType)
	}

	// Find the repository by slug
	repo, err := api.DB.GetRepositoryBySlugAndWorkspaceID(wflConfig.Repository, workspace.ID)
	if err != nil {
		return nil, nil, err
	}

	// Find the connection by ID
	connectionID, err := api.SQIDManager.Decode("connections", wflConfig.ConnectionID)
	if err != nil {
		return nil, nil, err
	}
	conn, err := api.DB.GetConnectionByID(uint(connectionID))
	if err != nil {
		return nil, nil, err
	}

	// Handle import workflowable case
	if workflowableType == irminmodels.WorkflowableTypeImport {
		// Trim only leading slash from the path and the connection path
		trimmedRepositoryPath := strings.TrimLeft(wflConfig.ImportToRepositoryPath, "/")
		trimmedConnectionPaths := make([]string, len(wflConfig.ImportFromConnectionPaths))
		for i, path := range wflConfig.ImportFromConnectionPaths {
			trimmedConnectionPaths[i] = strings.TrimLeft(path, "/")
		}

		// Create import workflowable
		importWorkflowable := &db.ImportWorkflowable{
			ConnectionID:              conn.ID,
			ImportFromConnectionPaths: trimmedConnectionPaths,
			RepositoryID:              repo.ID,
			RepositoryBranch:          wflConfig.RepositoryBranch,
			ImportToRepositoryPath:    trimmedRepositoryPath,
			FieldMappings:             wflConfig.FieldMappings,
		}
		if createImportWorkflowableErr := tx.Create(importWorkflowable).Error; createImportWorkflowableErr != nil {
			return nil, nil, createImportWorkflowableErr
		}
		return importWorkflowable, nil, nil
	}

	// Trim only leading slash from the path and the connection path
	trimmedConnectionPath := strings.TrimLeft(wflConfig.ExportToConnectionPath, "/")
	trimmedRepositoryPaths := make([]string, len(wflConfig.ExportFromRepositoryPaths))
	for i, path := range wflConfig.ExportFromRepositoryPaths {
		trimmedRepositoryPaths[i] = strings.TrimLeft(path, "/")
	}

	// Handle export workflowable case
	exportWorkflowable := &db.ExportWorkflowable{
		ConnectionID:              conn.ID,
		ExportToConnectionPath:    trimmedConnectionPath,
		RepositoryID:              repo.ID,
		RepositoryBranch:          wflConfig.RepositoryBranch,
		ExportFromRepositoryPaths: trimmedRepositoryPaths,
		FieldMappings:             wflConfig.FieldMappings,
	}
	if createExportWorkflowableErr := tx.Create(exportWorkflowable).Error; createExportWorkflowableErr != nil {
		return nil, nil, createExportWorkflowableErr
	}
	return nil, exportWorkflowable, nil
}

// createActionWorkflowable is a helper function to create action workflowable.
func (api *APIControllers) createActionWorkflowable(
	tx *gorm.DB,
	workspace *db.Workspace,
	config *irminmodels.Workflowable,
) (*db.ActionWorkflowable, error) {
	if config == nil {
		return nil, errors.New("action configuration is required")
	}

	// Process input data
	var inputData []db.ActionWorkflowableInput
	for _, inputObject := range config.Input {
		repository, getRepoErr := api.DB.GetRepositoryBySlugAndWorkspaceID(
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

	// Handle repository if specified
	var repository *db.Repository
	if config.Repository != "" {
		var getRepositoryBySlugAndWorkspaceIDErr error
		repository, getRepositoryBySlugAndWorkspaceIDErr = api.DB.GetRepositoryBySlugAndWorkspaceID(
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
		if config.ResultsRepositoryPath == "" {
			return nil, errors.New("results repository path is required when repository is specified")
		}

		repositoryID := repository.ID
		branch := *config.ResultsRepositoryBranch
		path := strings.TrimPrefix(config.ResultsRepositoryPath, "/")

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

	if createActionWorkflowableErr := tx.Create(&workflowable).Error; createActionWorkflowableErr != nil {
		return nil, createActionWorkflowableErr
	}
	return &workflowable, nil
}

// createPipelineWorkflowable is a helper function to create pipeline workflowable.
func (api *APIControllers) createPipelineWorkflowable(
	tx *gorm.DB,
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

		err := api.processStageByType(&newStage, stage, workspace)
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
	if createPipelineWorkflowableErr := tx.Create(pipelineWorkflowable).Error; createPipelineWorkflowableErr != nil {
		return nil, createPipelineWorkflowableErr
	}
	return pipelineWorkflowable, nil
}

// processStageByType processes a stage based on its type.
func (api *APIControllers) processStageByType(
	newStage *db.PipelineStage,
	stage irminmodels.PipelineStage,
	workspace *db.Workspace,
) error {
	switch stage.Type {
	case irminmodels.PipelineStageTypeAction:
		return api.processActionStage(newStage, stage)
	case irminmodels.PipelineStageTypeConnection:
		return api.processConnectionStage(newStage, stage)
	case irminmodels.PipelineStageTypeRepository:
		return api.processRepositoryStage(newStage, stage, workspace)
	default:
		return fmt.Errorf("invalid stage type: %s", stage.Type)
	}
}

// processActionStage processes an action stage.
func (api *APIControllers) processActionStage(newStage *db.PipelineStage, stage irminmodels.PipelineStage) error {
	newStage.Type = db.PipelineStageTypeAction
	if stage.Executable != nil {
		executable := strings.TrimPrefix(*stage.Executable, "/")
		newStage.Executable = &executable
	}
	return nil
}

// processConnectionStage processes a connection stage.
func (api *APIControllers) processConnectionStage(newStage *db.PipelineStage, stage irminmodels.PipelineStage) error {
	newStage.Type = db.PipelineStageTypeConnection
	if stage.ConnectionID == nil {
		return nil
	}

	parsedConnID, parseConnIDErr := api.SQIDManager.Decode("connections", *stage.ConnectionID)
	if parseConnIDErr != nil {
		return parseConnIDErr
	}

	connection, getConnectionByIDErr := api.DB.GetConnectionByID(uint(parsedConnID))
	if getConnectionByIDErr != nil {
		return getConnectionByIDErr
	}

	newStage.ConnectionID = &connection.ID

	if stage.ConnectionReadPaths != nil {
		readPaths := []string{}
		for _, path := range stage.ConnectionReadPaths {
			readPaths = append(readPaths, strings.TrimPrefix(path, "/"))
		}
		newStage.ConnectionReadPaths = readPaths
	}

	if stage.ConnectionWritePath != nil {
		writePath := strings.TrimPrefix(*stage.ConnectionWritePath, "/")
		newStage.ConnectionWritePath = &writePath
	}

	return nil
}

// processRepositoryStage processes a repository stage.
func (api *APIControllers) processRepositoryStage(
	newStage *db.PipelineStage,
	stage irminmodels.PipelineStage,
	workspace *db.Workspace,
) error {
	newStage.Type = db.PipelineStageTypeRepository
	if stage.Repository == nil {
		return nil
	}

	repository, getRepositoryBySlugAndWorkspaceIDErr := api.DB.GetRepositoryBySlugAndWorkspaceID(
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
		for _, path := range stage.RepositoryReadPaths {
			readPaths = append(readPaths, strings.TrimPrefix(path, "/"))
		}
		newStage.RepositoryReadPaths = readPaths
	}

	if stage.RepositoryWritePath != nil {
		writePath := strings.TrimPrefix(*stage.RepositoryWritePath, "/")
		newStage.RepositoryWritePath = &writePath
	}

	return nil
}
