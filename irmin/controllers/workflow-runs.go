package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

func (api *APIControllers) TriggerWorkflowRun(c fiber.Ctx) error {
	// Get the dictionary, workflow and the user from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workflow, workflowOk := c.Locals("workflow").(*db.Workflow)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !dictOk || !workflowOk || !userOk || !workspaceOk {
		api.Logger.Error(
			"Error getting workflow, user or workspace from context",
			"workflowOk",
			workflowOk,
			"userOk",
			userOk,
			"workspaceOk",
			workspaceOk,
		)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Create a new workflow run.
	var run *db.WorkflowRun
	transactionErr := api.DB.WithContext(c).Transaction(func(tx *gorm.DB) error {
		var err error
		run, err = lib.CreateWorkflowRun(tx, workflow, user, nil)
		if err != nil {
			return err
		}
		return nil
	})
	if transactionErr != nil {
		api.Logger.Error("Error creating workflow run", "error", transactionErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: api.lm.T(dict, "error_occurred"),
		})
	}

	// We don't need to actually execute the workflow here, as the orchestrator will do that.

	// Format the workflow run for the response.
	formattedRun, formatErr := formatter.FormatWorkflowRunResponse(run, api.SQIDManager)
	if formatErr != nil {
		api.Logger.Error("Error formatting workflow run", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: api.lm.T(dict, "error_occurred"),
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Workflow run %s created", formattedRun.ID),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the formatted workflow run.
	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Data: formattedRun,
	})
}

func (api *APIControllers) WorkflowRunsIndex(c fiber.Ctx) error {
	// Get the dictionary, workflow, user and workspace from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workflow, workflowOk := c.Locals("workflow").(*db.Workflow)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !dictOk || !workflowOk || !userOk || !workspaceOk {
		api.Logger.Error(
			"Error getting workflow, user or workspace from context",
			"workflowOk",
			workflowOk,
			"userOk",
			userOk,
			"workspaceOk",
			workspaceOk,
		)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the query parameters from the request.
	params, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{
		"page",
		"per_page",
	})
	if parseQueryParamsErr != nil {
		api.Logger.Error("Error parsing query parameters", "error", parseQueryParamsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Parse pagination parameters using the helper
	pagination := parsePaginationParams(params)

	// Get the workflow runs for the workflow.
	runs, count, getWorkflowRunsErr := api.DB.GetWorkflowRunsByWorkflowID(
		workflow.ID,
		pagination.perPage,
		pagination.offset,
	)
	if getWorkflowRunsErr != nil {
		api.Logger.Error("error getting workflow runs", "error", getWorkflowRunsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: api.lm.T(dict, "error_occurred"),
		})
	}

	// Filter workflow runs based on user permissions
	filteredRuns, err := lib.IsAllowedFilter(
		api.permissionService,
		user,
		workspace,
		db.PolicyResourceWorkflowRun,
		db.PolicyActionRead,
		runs,
		func(r db.WorkflowRun) uint { return r.WorkflowID },
	)
	if err != nil {
		api.Logger.Error("Error filtering workflow runs by permissions", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the workflow runs for the response.
	formattedRuns, formatErr := formatter.FormatIndexResponse(
		filteredRuns,
		formatter.FormatWorkflowRunResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		api.Logger.Error("error formatting workflow runs", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: api.lm.T(dict, "error_occurred"),
		})
	}

	// Build pagination response using the helper
	paginationResponse := buildPaginationResponse(count, pagination)

	// Return the formatted workflow runs.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Pagination: paginationResponse,
		Data:       formattedRuns,
	})
}

func (api *APIControllers) WorkflowRunsShow(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workflow, workflowOk := c.Locals("workflow").(*db.Workflow)

	if !dictOk || !workflowOk {
		api.Logger.Error("Error getting workflow from context", "workflowOk", workflowOk)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the run sqid from the request URL.
	runSqid := c.Params("run")
	if runSqid == "" {
		api.Logger.Error("No workflow run selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Decode the workflow run ID.
	workflowRunID, decodeSqidErr := api.SQIDManager.Decode("workflow-runs", runSqid)
	if decodeSqidErr != nil {
		api.Logger.Error("Error decoding invite sqid", "error", decodeSqidErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Find the workflow run by its ID.
	workflowRun, getWorkflowRunErr := api.DB.GetWorkflowRunByID(uint(workflowRunID))
	if getWorkflowRunErr != nil {
		api.Logger.Error("Error retrieving workflow run", "error", getWorkflowRunErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Make sure the workflow run belongs to the workflow.
	if workflowRun.WorkflowID != workflow.ID {
		api.Logger.Error("Workflow run does not belong to workflow")
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the workflow run for the response.
	formattedRun, formatErr := formatter.FormatWorkflowRunResponse(workflowRun, api.SQIDManager)
	if formatErr != nil {
		api.Logger.Error("Error formatting workflow run", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: api.lm.T(dict, "error_occurred"),
		})
	}

	// Return the formatted workflow run.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: formattedRun,
	})
}

func (api *APIControllers) WorkflowRunsDestroy(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	workflow, workflowOk := c.Locals("workflow").(*db.Workflow)

	if !dictOk || !userOk || !workspaceOk || !workflowOk {
		api.Logger.Error(
			"Error getting workflow, user, workspace or workflow from context",
			"workflowOk",
			workflowOk,
			"userOk",
			userOk,
			"workspaceOk",
			workspaceOk,
		)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the run sqid from the request URL.
	runSqid := c.Params("run")
	if runSqid == "" {
		api.Logger.Error("No workflow run selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Decode the workflow run ID.
	workflowRunID, decodeSqidErr := api.SQIDManager.Decode("workflow-runs", runSqid)
	if decodeSqidErr != nil {
		api.Logger.Error("Error decoding workflow run sqid", "error", decodeSqidErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Find the workflow run by its ID.
	workflowRun, getWorkflowRunErr := api.DB.GetWorkflowRunByID(uint(workflowRunID))
	if getWorkflowRunErr != nil {
		api.Logger.Error("Error retrieving workflow run", "error", getWorkflowRunErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Make sure the workflow run belongs to the workflow.
	if workflowRun.WorkflowID != workflow.ID {
		api.Logger.Error("Workflow run does not belong to workflow")
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Change the workflow run status to cancelled.
	workflowRun.Status = irminmodels.WorkflowStatusCancelled
	if saveErr := api.DB.Save(&workflowRun).Error; saveErr != nil {
		api.Logger.Error("Error cancelling workflow run", "error", saveErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: api.lm.T(dict, "error_occurred"),
		})
	}

	// The orchestrator will notice the cancelled status and stop the workflow execution.

	// Format the workflow run for the response.
	formattedRun, formatErr := formatter.FormatWorkflowRunResponse(workflowRun, api.SQIDManager)
	if formatErr != nil {
		api.Logger.Error("Error formatting workflow run", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: api.lm.T(dict, "error_occurred"),
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeWarning,
		Description: fmt.Sprintf("Workflow run %s cancelled", formattedRun.ID),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
		WorkflowID:  &workflow.ID,
	})

	// Return the formatted workflow run.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: formattedRun,
	})
}
