package controllers

import (
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// TriggerWorkflowRun godoc
// @Summary Trigger workflow execution
// @Description Create and start a new workflow run for the specified workflow
// @Tags workflow-runs
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param workflow_slug path string true "Workflow slug"
// @Success 201 {object} irminmodels.IrminAPIResponse{data=irminmodels.WorkflowRun} "Workflow run created and started successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workflow not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/workflows/{workflow_slug}/runs [post]
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

	// Create the workflow run
	run, err := api.Services.CreateWorkflowRun(c, user, workspace, workflow)
	if err != nil {
		api.Logger.Error("Error creating workflow run", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: api.lm.T(dict, "error_occurred"),
		})
	}

	// Format the workflow run for the response.
	formattedRun, formatErr := formatter.FormatWorkflowRunResponse(run, api.SQIDManager)
	if formatErr != nil {
		api.Logger.ErrorContext(c, "Error formatting workflow run", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: api.lm.T(dict, "error_occurred"),
		})
	}

	// Invalidate workflow runs area for this workflow (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/workflows/%s/runs", workspace.Slug, formattedRun.WorkflowID),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the formatted workflow run.
	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Data: formattedRun,
	})
}

// WorkflowRunsIndex godoc
// @Summary List workflow runs
// @Description Get all runs for a specific workflow with pagination and permission filtering
// @Tags workflow-runs
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param workflow_slug path string true "Workflow slug"
// @Param page query int false "Page number for pagination" default(1)
// @Param per_page query int false "Number of items per page" default(10)
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.WorkflowRun,pagination=irminmodels.IrminAPIPaginationMetadata} "Workflow runs retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid pagination parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workflow not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/workflows/{workflow_slug}/runs [get]
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
	runs, count, err := api.Services.ListWorkflowRuns(
		c,
		user,
		workspace,
		workflow,
		pagination.perPage,
		pagination.offset,
	)
	if err != nil {
		api.Logger.Error("error getting workflow runs", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: api.lm.T(dict, "error_occurred"),
		})
	}

	// Format the workflow runs for the response.
	formattedRuns, formatErr := formatter.FormatIndexResponse(
		runs,
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

// WorkflowRunsShow godoc
// @Summary Get workflow run details
// @Description Get details of a specific workflow run including status and execution logs
// @Tags workflow-runs
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param workflow_slug path string true "Workflow slug"
// @Param run path string true "Workflow run ID (SQID encoded)"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.WorkflowRun} "Workflow run details retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid run ID"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workflow run not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/workflows/{workflow_slug}/runs/{run} [get]
func (api *APIControllers) WorkflowRunsShow(c fiber.Ctx) error {
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

	// Parse the run sqid from the request URL.
	runSqid := c.Params("run")
	if runSqid == "" {
		api.Logger.Error("No workflow run selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get the workflow run.
	workflowRun, err := api.Services.GetWorkflowRun(c, user, workspace, workflow, runSqid)
	if err != nil {
		api.Logger.Error("Error getting workflow run", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: api.lm.T(dict, "error_occurred"),
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

// WorkflowRunsDestroy godoc
// @Summary Cancel workflow run
// @Description Cancel a running workflow execution (sets status to cancelled)
// @Tags workflow-runs
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param workflow_slug path string true "Workflow slug"
// @Param run path string true "Workflow run ID (SQID encoded)"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.WorkflowRun} "Workflow run cancelled successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid run ID"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workflow run not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/workflows/{workflow_slug}/runs/{run} [delete]
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

	// Cancel the workflow run.
	workflowRun, err := api.Services.CancelWorkflowRun(c, user, workspace, workflow, runSqid)
	if err != nil {
		api.Logger.Error("Error cancelling workflow run", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: api.lm.T(dict, "error_occurred"),
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

	// Invalidate workflows area for this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/workflows", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the formatted workflow run.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: formattedRun,
	})
}

// AllWorkflowRunsIndex godoc
// @Summary List all workflow runs in workspace
// @Description Get all workflow runs for all workflows in the workspace with pagination and permission filtering
// @Tags workflow-runs
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param page query int false "Page number for pagination" default(1)
// @Param per_page query int false "Number of items per page" default(10)
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.WorkflowRun,pagination=irminmodels.IrminAPIPaginationMetadata} "All workflow runs retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid pagination parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/workflows/runs [get]
func (api *APIControllers) AllWorkflowRunsIndex(c fiber.Ctx) error {
	// Get the dictionary, user and workspace from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !dictOk || !userOk || !workspaceOk {
		api.Logger.Error(
			"Error getting user or workspace from context",
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

	// Get all workflow runs for the workspace.
	runs, count, err := api.Services.ListAllWorkflowRuns(
		c,
		user,
		workspace,
		pagination.perPage,
		pagination.offset,
	)
	if err != nil {
		api.Logger.Error("error getting all workflow runs", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Message: api.lm.T(dict, "error_occurred"),
		})
	}

	// Format the workflow runs for the response.
	formattedRuns, formatErr := formatter.FormatIndexResponse(
		runs,
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
