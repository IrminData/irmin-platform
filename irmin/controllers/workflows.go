package controllers

import (
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"

	"github.com/gofiber/fiber/v3"
)

// WorkflowsIndex godoc
// @Summary List workspace workflows
// @Description Get all workflows in the workspace with optional type filtering and permission-based access
// @Tags workflows
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param type query string false "Filter by workflow type (import, export, action, pipeline)"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.Workflow} "Workflows retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid type parameter"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/workflows [get]
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

	// Get the workflows
	workflows, err := api.Services.ListWorkflows(c, user, workspace, query["type"])
	if err != nil {
		api.Logger.Error("Error getting workflows", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Create a wrapper function that adapts FormatWorkflowResponse to the expected signature
	formatWorkflow := func(workflow *db.Workflow, sqidManager *irminsqids.SQIDManager) (*irminmodels.Workflow, error) {
		return formatter.FormatWorkflowResponse(api.DB, workflow, sqidManager)
	}

	// Format the response using FormatIndexResponse
	workflowsResponse, err := formatter.FormatIndexResponse(
		workflows,
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
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: workflowsResponse,
	})
}

// WorkflowsShow godoc
// @Summary Get workflow details
// @Description Get details of a specific workflow including its configuration, schedule, and workflowable settings
// @Tags workflows
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param workflow_slug path string true "Workflow slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Workflow} "Workflow details retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workflow not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/workflows/{workflow_slug} [get]
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
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: workflowResponse,
	})
}

// WorkflowsUpdate godoc
// @Summary Update workflow properties
// @Description Update basic workflow properties (name, description, documentation)
// @Tags workflows
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param workflow_slug path string true "Workflow slug"
// @Param body body irmincore.UpdateWorkflowRequest true "Workflow update request"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Workflow} "Workflow updated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid workflow data"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workflow not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/workflows/{workflow_slug} [patch]
//
//nolint:dupl // This is not a duplicate, it's a different endpoint, which functions in a similar way.
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

	// Parse and validate the JSON request body
	var req irmincore.UpdateWorkflowRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Update the workflow
	workflow, err = api.Services.UpdateWorkflow(c, user, workspace, workflow, req)
	if err != nil {
		api.Logger.Error("Error updating workflow", "error", err)
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

	// Invalidate caches for workflows in this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/workflows", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workflow_updated"),
		Data:    workflowResponse,
	})
}

// WorkflowsStore godoc
// @Summary Create workflow
// @Description Create a new workflow with specified type (import, export, action, or pipeline) and schedule
// @Tags workflows
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param body body irmincore.WorkflowRequest true "Workflow creation request with workflowable configuration"
// @Success 201 {object} irminmodels.IrminAPIResponse{data=irminmodels.Workflow} "Workflow created successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid workflow configuration"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/workflows [post]
func (api *APIControllers) WorkflowsStore(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse and validate the JSON request body
	var req irmincore.WorkflowRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Create the workflow
	workflow, err := api.Services.CreateWorkflow(c, user, workspace, req)
	if err != nil {
		api.Logger.Error("Error creating workflow", "error", err)
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

	// Invalidate caches for workflows in this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/workflows", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workflow_created"),
		Data:    workflowResponse,
	})
}

// WorkflowableUpdate godoc
// @Summary Update workflow configuration
// @Description Update the workflowable configuration (import/export/action/pipeline settings) of a workflow
// @Tags workflows
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param workflow_slug path string true "Workflow slug"
// @Param body body irminmodels.Workflowable true "Workflowable configuration update"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Workflow} "Workflow configuration updated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid workflowable configuration or type change"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workflow not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/workflows/{workflow_slug}/workflowable [patch]
//
//nolint:dupl // This is not a duplicate, it's a different endpoint, which functions in a similar way.
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

	// Parse and validate the JSON request body
	var req irminmodels.Workflowable
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Update the workflowable
	workflow, err = api.Services.UpdateWorkflowable(c, user, workspace, workflow, req)
	if err != nil {
		api.Logger.Error("Error updating workflowable", "error", err)
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

	// Invalidate caches for workflows in this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/workflows", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workflow_updated"),
		Data:    workflowResponse,
	})
}

// ScheduleUpdate godoc
// @Summary Update workflow schedule
// @Description Update the scheduling configuration and triggers for a workflow
// @Tags workflows
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param workflow_slug path string true "Workflow slug"
// @Param body body irminmodels.Schedule true "Schedule configuration update"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Workflow} "Workflow schedule updated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid schedule configuration"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workflow not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/workflows/{workflow_slug}/schedule [patch]
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

	// Update the workflow schedule
	workflow, err = api.Services.UpdateWorkflowSchedule(c, user, workspace, workflow, schedule)
	if err != nil {
		api.Logger.Error("Error updating workflow schedule", "error", err)
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

	// Invalidate caches for workflows in this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/workflows", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "schedule_updated"),
		Data:    workflowResponse,
	})
}

// WorkflowsDestroy godoc
// @Summary Delete workflow
// @Description Delete a workflow and all its related data (schedule, workflowable, runs)
// @Tags workflows
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param workflow_slug path string true "Workflow slug"
// @Success 200 {object} irminmodels.IrminAPIResponse "Workflow deleted successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workflow not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/workflows/{workflow_slug} [delete]
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

	// Delete the workflow
	err = api.Services.DeleteWorkflow(c, user, workspace, workflow)
	if err != nil {
		api.Logger.Error("Error deleting workflow", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate caches for workflows in this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/workflows", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workflow_deleted"),
	})
}

// TransferWorkflowOwnership godoc
// @Summary Transfer workflow ownership
// @Description Transfer ownership of a workflow to another user in the workspace
// @Tags workflows
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param workflow_slug path string true "Workflow slug"
// @Param body body irmincore.TransferWorkflowOwnershipRequest true "Ownership transfer request"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Workflow} "Ownership transferred successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid new owner or not a workspace member"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workflow not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/workflows/{workflow_slug}/transfer-ownership [post]
//
//nolint:dupl // This is not a duplicate, it's a different endpoint, which functions in a similar way.
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

	// Parse and validate the JSON request body
	var req irmincore.TransferWorkflowOwnershipRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Transfer the workflow ownership
	workflow, err = api.Services.TransferWorkflowOwnership(c, user, workspace, workflow, req)
	if err != nil {
		api.Logger.Error("Error transferring workflow ownership", "error", err)
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

	// Invalidate caches for workflows in this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/workflows", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workflow_ownership_transferred"),
		Data:    workflowResponse,
	})
}

// PauseWorkflow godoc
// @Summary Pause workflow
// @Description Pause a workflow to stop scheduled executions (can be resumed later)
// @Tags workflows
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param workflow_slug path string true "Workflow slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Workflow} "Workflow paused successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workflow not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/workflows/{workflow_slug}/pause [post]
//
//nolint:dupl // This is not a duplicate, it's a different endpoint, which functions in a similar way.
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
	workflow, err = api.Services.PauseWorkflow(c, user, workspace, workflow)
	if err != nil {
		api.Logger.Error("Error pausing workflow", "error", err)
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

	// Invalidate caches for workflows in this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/workflows", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workflow_stopped"),
		Data:    workflowResponse,
	})
}

// StartWorkflow godoc
// @Summary Start workflow
// @Description Start/resume a paused workflow to enable scheduled executions
// @Tags workflows
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param workflow_slug path string true "Workflow slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Workflow} "Workflow started successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - workflow is already running"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workflow not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/workflows/{workflow_slug}/start [post]
//
//nolint:dupl // This is not a duplicate, it's a different endpoint, which functions in a similar way.
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

	// Start the workflow
	workflow, err = api.Services.StartWorkflow(c, user, workspace, workflow)
	if err != nil {
		api.Logger.Error("Error starting workflow", "error", err)
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

	// Invalidate caches for workflows in this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/workflows", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workflow_started"),
		Data:    workflowResponse,
	})
}
