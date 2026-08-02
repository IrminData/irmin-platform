package controllers

import (
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/services"
	"irmin-api/utils"
	"strconv"
	"time"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
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
		return api.handleServiceError(
			c,
			"Error getting locals for TriggerWorkflowRun",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Create the workflow run
	run, err := api.Services.CreateWorkflowRun(c, user, workspace, workflow)
	if err != nil {
		return api.handleServiceError(c, "Error creating workflow run", err, dict)
	}

	// Format the workflow run for the response.
	formattedRun, formatErr := formatter.FormatWorkflowRunResponse(run, api.SQIDManager)
	if formatErr != nil {
		return api.handleServiceError(c, "Error formatting workflow run", formatErr, dict)
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
// @Description Get all runs for a specific workflow with pagination and permission filtering.
// @Description Supports both offset-based (page/per_page) and cursor-based (cursor/per_page) pagination.
// @Description Cursor pagination is more efficient for deep pages - O(1) vs O(n) for offset.
// @Tags workflow-runs
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param workflow_slug path string true "Workflow slug"
// @Param page query int false "Page number for pagination" default(1)
// @Param per_page query int false "Number of items per page" default(100)
// @Param cursor query string false "ISO 8601 datetime cursor for cursor-based pagination"
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
		return api.handleServiceError(
			c,
			"Error getting locals for WorkflowRunsIndex",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Get the query parameters from the request.
	params, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{
		"page",
		"per_page",
		"cursor",
	})
	if parseQueryParamsErr != nil {
		return api.handleServiceError(
			c,
			"Error parsing query parameters",
			fmt.Errorf("%w: %w", services.ErrInvalidQueryParams, parseQueryParamsErr),
			dict,
		)
	}

	// Check if cursor-based pagination is requested
	if cursorStr, hasCursor := params["cursor"]; hasCursor && cursorStr != "" {
		return api.workflowRunsIndexWithCursor(c, dict, user, workspace, workflow, params)
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
		return api.handleServiceError(c, "Error getting workflow runs", err, dict)
	}

	// Format the workflow runs for the response.
	formattedRuns, formatErr := formatter.FormatIndexResponse(
		runs,
		formatter.FormatWorkflowRunResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		return api.handleServiceError(c, "Error formatting workflow runs", formatErr, dict)
	}

	// Build pagination response using the helper
	paginationResponse := buildPaginationResponse(count, pagination)

	// Return the formatted workflow runs.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Pagination: paginationResponse,
		Data:       formattedRuns,
	})
}

// workflowRunsIndexWithCursor handles cursor-based pagination for workflow runs.
func (api *APIControllers) workflowRunsIndexWithCursor(
	c fiber.Ctx,
	dict locales.Dictionary,
	user *db.User,
	workspace *db.Workspace,
	workflow *db.Workflow,
	params map[string]string,
) error {
	// Parse cursor timestamp (RFC3339Nano for sub-second precision)
	cursorStr := params["cursor"]
	cursor, parseErr := time.Parse(time.RFC3339Nano, cursorStr)
	if parseErr != nil {
		// Fall back to RFC3339 for backwards compatibility
		cursor, parseErr = time.Parse(time.RFC3339, cursorStr)
		if parseErr != nil {
			return api.handleServiceError(
				c,
				"Invalid cursor format",
				fmt.Errorf("%w: cursor must be ISO 8601 datetime", services.ErrInvalidQueryParams),
				dict,
			)
		}
	}

	// Parse limit
	limit := 100
	if params["per_page"] != "" {
		if parsedLimit, err := strconv.Atoi(params["per_page"]); err == nil {
			limit = parsedLimit
		}
	}

	// Get the workflow runs using cursor pagination
	// Fetch limit + 1 to determine if there are more items
	runs, err := api.Services.ListWorkflowRunsWithCursor(c, user, workspace, workflow, &cursor, limit+1)
	if err != nil {
		return api.handleServiceError(c, "Error getting workflow runs", err, dict)
	}

	// Check if there are more items
	hasMore := len(runs) > limit
	if len(runs) > limit {
		runs = runs[:limit]
	}

	// Format the workflow runs for the response.
	formattedRuns, formatErr := formatter.FormatIndexResponse(
		runs,
		formatter.FormatWorkflowRunResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		return api.handleServiceError(c, "Error formatting workflow runs", formatErr, dict)
	}

	// Build cursor pagination response
	var nextCursor *string
	if hasMore && len(runs) > 0 {
		// Use RFC3339Nano for sub-second precision to avoid skipping items
		nextCursorStr := runs[len(runs)-1].CreatedAt.Format(time.RFC3339Nano)
		nextCursor = &nextCursorStr
	}

	paginationResponse := buildCursorPaginationResponse(len(runs), limit, hasMore, nextCursor)

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
		return api.handleServiceError(
			c,
			"Error getting locals for WorkflowRunsShow",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the run sqid from the request URL.
	runSqid := c.Params("run")
	if runSqid == "" {
		return api.handleServiceError(c, "No workflow run selected", services.ErrInvalidRequest, dict)
	}

	// Get the workflow run.
	workflowRun, err := api.Services.GetWorkflowRun(c, user, workspace, workflow, runSqid)
	if err != nil {
		return api.handleServiceError(c, "Error getting workflow run", err, dict)
	}

	// Format the workflow run for the response.
	formattedRun, formatErr := formatter.FormatWorkflowRunResponse(workflowRun, api.SQIDManager)
	if formatErr != nil {
		return api.handleServiceError(c, "Error formatting workflow run", formatErr, dict)
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
		return api.handleServiceError(
			c,
			"Error getting locals for WorkflowRunsDestroy",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the run sqid from the request URL.
	runSqid := c.Params("run")

	// Cancel the workflow run.
	workflowRun, err := api.Services.CancelWorkflowRun(c, user, workspace, workflow, runSqid)
	if err != nil {
		return api.handleServiceError(c, "Error cancelling workflow run", err, dict)
	}

	// Format the workflow run for the response.
	formattedRun, formatErr := formatter.FormatWorkflowRunResponse(workflowRun, api.SQIDManager)
	if formatErr != nil {
		return api.handleServiceError(c, "Error formatting workflow run", formatErr, dict)
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
// @Description Get all workflow runs for all workflows in the workspace with pagination and permission filtering.
// @Description Supports both offset-based (page/per_page) and cursor-based (cursor/per_page) pagination.
// @Description Cursor pagination is more efficient for deep pages - O(1) vs O(n) for offset.
// @Tags workflow-runs
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param page query int false "Page number for pagination" default(1)
// @Param per_page query int false "Number of items per page" default(100)
// @Param cursor query string false "ISO 8601 datetime cursor for cursor-based pagination"
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
		return api.handleServiceError(
			c,
			"Error getting locals for AllWorkflowRunsIndex",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Get the query parameters from the request.
	params, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{
		"page",
		"per_page",
		"cursor",
	})
	if parseQueryParamsErr != nil {
		return api.handleServiceError(
			c,
			"Error parsing query parameters",
			fmt.Errorf("%w: %w", services.ErrInvalidQueryParams, parseQueryParamsErr),
			dict,
		)
	}

	// Check if cursor-based pagination is requested
	if cursorStr, hasCursor := params["cursor"]; hasCursor && cursorStr != "" {
		return api.allWorkflowRunsIndexWithCursor(c, dict, user, workspace, params)
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
		return api.handleServiceError(c, "Error getting all workflow runs", err, dict)
	}

	// Format the workflow runs for the response.
	formattedRuns, formatErr := formatter.FormatIndexResponse(
		runs,
		formatter.FormatWorkflowRunResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		return api.handleServiceError(c, "Error formatting workflow runs", formatErr, dict)
	}

	// Build pagination response using the helper
	paginationResponse := buildPaginationResponse(count, pagination)

	// Return the formatted workflow runs.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Pagination: paginationResponse,
		Data:       formattedRuns,
	})
}

// allWorkflowRunsIndexWithCursor handles cursor-based pagination for all workflow runs.
func (api *APIControllers) allWorkflowRunsIndexWithCursor(
	c fiber.Ctx,
	dict locales.Dictionary,
	user *db.User,
	workspace *db.Workspace,
	params map[string]string,
) error {
	// Parse cursor timestamp (RFC3339Nano for sub-second precision)
	cursorStr := params["cursor"]
	cursor, parseErr := time.Parse(time.RFC3339Nano, cursorStr)
	if parseErr != nil {
		// Fall back to RFC3339 for backwards compatibility
		cursor, parseErr = time.Parse(time.RFC3339, cursorStr)
		if parseErr != nil {
			return api.handleServiceError(
				c,
				"Invalid cursor format",
				fmt.Errorf("%w: cursor must be ISO 8601 datetime", services.ErrInvalidQueryParams),
				dict,
			)
		}
	}

	// Parse limit
	limit := 100
	if params["per_page"] != "" {
		if parsedLimit, err := strconv.Atoi(params["per_page"]); err == nil {
			limit = parsedLimit
		}
	}

	// Get all workflow runs using cursor pagination
	// lastPreFilterTime is used for cursor even when all items are filtered by permissions
	// hasMoreInDB indicates if there are more items in DB before permission filtering
	runs, lastPreFilterTime, hasMoreInDB, err := api.Services.ListAllWorkflowRunsWithCursor(
		c, user, workspace, &cursor, limit,
	)
	if err != nil {
		return api.handleServiceError(c, "Error getting all workflow runs", err, dict)
	}

	// Format the workflow runs for the response.
	formattedRuns, formatErr := formatter.FormatIndexResponse(
		runs,
		formatter.FormatWorkflowRunResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		return api.handleServiceError(c, "Error formatting workflow runs", formatErr, dict)
	}

	// Build cursor pagination response
	// Use lastPreFilterTime for cursor to ensure pagination works even when items are filtered out
	var nextCursor *string
	if hasMoreInDB && lastPreFilterTime != nil {
		// Use RFC3339Nano for sub-second precision to avoid skipping items
		nextCursorStr := lastPreFilterTime.Format(time.RFC3339Nano)
		nextCursor = &nextCursorStr
	}

	paginationResponse := buildCursorPaginationResponse(len(runs), limit, hasMoreInDB, nextCursor)

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Pagination: paginationResponse,
		Data:       formattedRuns,
	})
}
