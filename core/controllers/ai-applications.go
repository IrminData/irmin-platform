package controllers

import (
	"errors"
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/services"
	"strconv"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	irminsqids "github.com/IrminData/irmin-platform/sdks/go/sqids"

	"github.com/gofiber/fiber/v3"
)

// AIApplicationsIndex godoc
// @Summary List AI applications
// @Description Get all AI applications in the workspace with permission-based access
// @Tags ai-applications
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.AIApplication} "AI applications retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/ai-applications [get]
func (api *APIControllers) AIApplicationsIndex(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		return api.handleServiceError(c, "Error validating workspace parameters", err, dict)
	}

	// Get the AI applications
	aiApplications, err := api.Services.ListAIApplications(c, user, workspace)
	if err != nil {
		return api.handleServiceError(c, "Failed to list AI applications", err, dict)
	}

	// Create a wrapper function that adapts FormatAIApplicationResponse to the expected signature
	formatAIApplication := func(aiApp *db.AIApplication, sqidManager *irminsqids.SQIDManager) (*irminmodels.AIApplication, error) {
		return formatter.FormatAIApplicationResponse(api.DB, aiApp, sqidManager)
	}

	// Format the response using FormatIndexResponse
	aiApplicationsResponse, err := formatter.FormatIndexResponse(
		aiApplications,
		formatAIApplication,
		api.SQIDManager,
	)
	if err != nil {
		return api.handleServiceError(
			c,
			"Failed to format AI applications",
			services.NewInternalErrorf("error formatting AI applications: %v", err),
			dict,
		)
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: aiApplicationsResponse,
	})
}

// AIApplicationsShow godoc
// @Summary Get AI application details
// @Description Get details of a specific AI application including its configuration and data sources
// @Tags ai-applications
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param ai_application_slug path string true "AI application slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.AIApplication} "AI application details retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "AI application not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/ai-applications/{ai_application_slug} [get]
func (api *APIControllers) AIApplicationsShow(c fiber.Ctx) error {
	_, dict, _, _, err := api.validateWorkspaceParams(c)
	if err != nil {
		return api.handleServiceError(c, "Error validating workspace parameters", err, dict)
	}

	// Get the AI application from locals
	aiApplication, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return api.handleServiceError(
			c,
			"Error getting locals for AIApplicationsShow",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Get the AI application response
	aiApplicationResponse, formatErr := formatter.FormatAIApplicationResponse(api.DB, aiApplication, api.SQIDManager)
	if formatErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format AI application response",
			services.NewInternalErrorf("error formatting AI application response: %v", formatErr),
			dict,
		)
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: aiApplicationResponse,
	})
}

// AIApplicationsStore godoc
// @Summary Create AI application
// @Description Create a new AI application with specified configuration and data sources
// @Tags ai-applications
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param body body irmincore.CreateAIApplicationRequest true "AI application creation request"
// @Success 201 {object} irminmodels.IrminAPIResponse{data=irminmodels.AIApplication} "AI application created successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid AI application configuration"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/ai-applications [post]
//
//nolint:dupl // Each resource type needs its own handler following similar patterns.
func (api *APIControllers) AIApplicationsStore(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		return api.handleServiceError(c, "Error validating workspace parameters", err, dict)
	}

	// Parse and validate the JSON request body
	var req irmincore.CreateAIApplicationRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Create the AI application
	aiApplication, err := api.Services.CreateAIApplication(c, user, workspace, req)
	if err != nil {
		return api.handleServiceError(c, "Failed to create AI application", err, dict)
	}

	// Get the AI application response
	aiApplicationResponse, err := formatter.FormatAIApplicationResponse(api.DB, aiApplication, api.SQIDManager)
	if err != nil {
		return api.handleServiceError(
			c,
			"Failed to format AI application response",
			services.NewInternalErrorf("error formatting AI application response: %v", err),
			dict,
		)
	}

	// Invalidate caches for AI applications in this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/ai-applications", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "ai_application_created"),
		Data:    aiApplicationResponse,
	})
}

// AIApplicationsUpdate godoc
// @Summary Update AI application
// @Description Update AI application properties (name, description, documentation, origins, data sources)
// @Tags ai-applications
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param ai_application_slug path string true "AI application slug"
// @Param body body irmincore.UpdateAIApplicationRequest true "AI application update request"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.AIApplication} "AI application updated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid AI application data"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "AI application not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/ai-applications/{ai_application_slug} [patch]
//
//nolint:dupl // Each resource type needs its own handler following similar patterns.
func (api *APIControllers) AIApplicationsUpdate(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		return api.handleServiceError(c, "Error validating workspace parameters", err, dict)
	}

	// Get the AI application from locals
	aiApplication, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return api.handleServiceError(
			c,
			"Error getting locals for AIApplicationsUpdate",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse and validate the JSON request body
	var req irmincore.UpdateAIApplicationRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Update the AI application
	aiApplication, err = api.Services.UpdateAIApplication(c, user, workspace, aiApplication, req)
	if err != nil {
		return api.handleServiceError(c, "Failed to update AI application", err, dict)
	}

	// Get the AI application response
	aiApplicationResponse, formatErr := formatter.FormatAIApplicationResponse(
		api.DB,
		aiApplication,
		api.SQIDManager,
	)
	if formatErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format AI application response",
			services.NewInternalErrorf("error formatting AI application response: %v", formatErr),
			dict,
		)
	}

	// Invalidate caches for AI applications in this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/ai-applications", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "ai_application_updated"),
		Data:    aiApplicationResponse,
	})
}

// AIApplicationsDestroy godoc
// @Summary Delete AI application
// @Description Delete an AI application and all its related data
// @Tags ai-applications
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param ai_application_slug path string true "AI application slug"
// @Success 200 {object} irminmodels.IrminAPIResponse "AI application deleted successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "AI application not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/ai-applications/{ai_application_slug} [delete]
//
//nolint:dupl // Each resource type needs its own handler following similar patterns.
func (api *APIControllers) AIApplicationsDestroy(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		return api.handleServiceError(c, "Error validating workspace parameters", err, dict)
	}

	// Get the AI application from locals
	aiApplication, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return api.handleServiceError(
			c,
			"Error getting locals for AIApplicationsDestroy",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Delete the AI application
	err = api.Services.DeleteAIApplication(c, user, workspace, aiApplication)
	if err != nil {
		return api.handleServiceError(c, "Failed to delete AI application", err, dict)
	}

	// Invalidate caches for AI applications in this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/ai-applications", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "ai_application_deleted"),
	})
}

// TransferAIApplicationOwnership godoc
// @Summary Transfer AI application ownership
// @Description Transfer ownership of an AI application to another user in the workspace
// @Tags ai-applications
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param ai_application_slug path string true "AI application slug"
// @Param body body irmincore.TransferAIApplicationOwnershipRequest true "Ownership transfer request"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.AIApplication} "Ownership transferred successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid new owner or not a workspace member"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "AI application not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/ai-applications/{ai_application_slug}/transfer-ownership [post]
//
//nolint:dupl // Each resource type needs its own handler following similar patterns.
func (api *APIControllers) TransferAIApplicationOwnership(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		return api.handleServiceError(c, "Error validating workspace parameters", err, dict)
	}

	// Get the AI application from locals
	aiApplication, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return api.handleServiceError(
			c,
			"Error getting locals for TransferAIApplicationOwnership",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse and validate the JSON request body
	var req irmincore.TransferAIApplicationOwnershipRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Transfer the AI application ownership
	aiApplication, err = api.Services.TransferAIApplicationOwnership(c, user, workspace, aiApplication, req)
	if err != nil {
		return api.handleServiceError(c, "Failed to transfer AI application ownership", err, dict)
	}

	// Get the AI application response
	aiApplicationResponse, formatErr := formatter.FormatAIApplicationResponse(
		api.DB,
		aiApplication,
		api.SQIDManager,
	)
	if formatErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format AI application response",
			services.NewInternalErrorf("error formatting AI application response: %v", formatErr),
			dict,
		)
	}

	// Invalidate caches for AI applications in this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/ai-applications", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "ai_application_ownership_transferred"),
		Data:    aiApplicationResponse,
	})
}

// AIApplicationToolLogs godoc
// @Summary List AI application tool audit logs
// @Description Get audit logs for all tool calls made through this AI application
// @Tags ai-applications
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param ai_application_slug path string true "AI application slug"
// @Param tool_name query string false "Filter by tool name"
// @Param limit query int false "Maximum number of logs to return (default 50)"
// @Param offset query int false "Number of logs to skip for pagination"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.AIApplicationToolLogsResponse} "Tool logs retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "AI application not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/ai-applications/{ai_application_slug}/tool-logs [get]
func (api *APIControllers) AIApplicationToolLogs(c fiber.Ctx) error {
	_, dict, _, _, err := api.validateWorkspaceParams(c)
	if err != nil {
		return api.handleServiceError(c, "Error validating workspace parameters", err, dict)
	}

	// Get the AI application from locals
	aiApplication, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return api.handleServiceError(
			c,
			"Error getting locals for AIApplicationToolLogs",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse query parameters
	toolName := c.Query("tool_name", "")
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	// Clamp limit and offset to reasonable bounds
	const (
		defaultLimit = 50
		maxLimit     = 200
	)
	if limit <= 0 {
		limit = defaultLimit
	} else if limit > maxLimit {
		limit = maxLimit
	}
	if offset < 0 {
		offset = 0
	}

	// Get the audit logs
	logs, total, dbErr := api.DB.GetAIApplicationToolLogs(aiApplication.ID, toolName, limit, offset)
	if dbErr != nil {
		return api.handleServiceError(
			c,
			"Failed to get AI application tool logs",
			services.NewInternalErrorf("error getting tool logs: %v", dbErr),
			dict,
		)
	}

	// Format the response
	formattedLogs := make([]irminmodels.AIApplicationToolLog, 0, len(logs))
	for _, log := range logs {
		formattedLogs = append(formattedLogs, irminmodels.AIApplicationToolLog{
			ID:         log.ID,
			ToolName:   log.ToolName,
			ToolType:   log.ToolType,
			InputsJSON: log.InputsJSON,
			Protocol:   string(log.Protocol),
			RequestIP:  log.RequestIP,
			UserAgent:  log.UserAgent,
			Origin:     log.Origin,
			DurationMs: log.DurationMs,
			Success:    log.Success,
			ErrorMsg:   log.ErrorMsg,
			CreatedAt:  log.CreatedAt,
		})
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: irminmodels.AIApplicationToolLogsResponse{
			Logs:   formattedLogs,
			Total:  total,
			Limit:  limit,
			Offset: offset,
		},
	})
}

// AIApplicationToolLogStats godoc
// @Summary Get AI application tool statistics
// @Description Get aggregated statistics for tool usage in this AI application
// @Tags ai-applications
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param ai_application_slug path string true "AI application slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.AIApplicationToolLogStats} "Tool stats retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "AI application not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/ai-applications/{ai_application_slug}/tool-logs/stats [get]
func (api *APIControllers) AIApplicationToolLogStats(c fiber.Ctx) error {
	_, dict, _, _, err := api.validateWorkspaceParams(c)
	if err != nil {
		return api.handleServiceError(c, "Error validating workspace parameters", err, dict)
	}

	// Get the AI application from locals
	aiApplication, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return api.handleServiceError(
			c,
			"Error getting locals for AIApplicationToolLogStats",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Get the stats
	stats, dbErr := api.DB.GetAIApplicationToolLogStats(aiApplication.ID)
	if dbErr != nil {
		return api.handleServiceError(
			c,
			"Failed to get AI application tool stats",
			services.NewInternalErrorf("error getting tool stats: %v", dbErr),
			dict,
		)
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: stats,
	})
}

// AIApplicationPendingOperations godoc
// @Summary Get AI application pending operations
// @Description Get pending operations awaiting approval for this AI application
// @Tags ai-applications
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param ai_application_slug path string true "AI application slug"
// @Param limit query int false "Limit (default 50, max 200)"
// @Param offset query int false "Offset (default 0)"
// @Success 200 {object} irminmodels.IrminAPIResponse "Pending operations retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "AI application not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/ai-applications/{ai_application_slug}/pending-operations [get]
func (api *APIControllers) AIApplicationPendingOperations(c fiber.Ctx) error {
	_, dict, _, _, err := api.validateWorkspaceParams(c)
	if err != nil {
		return api.handleServiceError(c, "Error validating workspace parameters", err, dict)
	}

	// Get the AI application from locals
	aiApplication, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return api.handleServiceError(
			c,
			"Error getting locals for AIApplicationPendingOperations",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse query parameters
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	// Clamp limit and offset to reasonable bounds
	const (
		defaultLimit = 50
		maxLimit     = 200
	)
	if limit <= 0 {
		limit = defaultLimit
	} else if limit > maxLimit {
		limit = maxLimit
	}
	if offset < 0 {
		offset = 0
	}

	// Get pending operations (only pending status)
	status := db.PendingOperationStatusPending
	pendingOperations, total, dbErr := api.DB.GetPendingOperationsByAIApplicationID(aiApplication.ID, &status, limit, offset)
	if dbErr != nil {
		return api.handleServiceError(
			c,
			"Failed to get pending operations",
			services.NewInternalErrorf("error getting pending operations: %v", dbErr),
			dict,
		)
	}

	// Format the response
	formattedWrites := make([]fiber.Map, 0, len(pendingOperations))
	for _, pw := range pendingOperations {
		pwSqid, encodeErr := api.SQIDManager.Encode("ai_application_pending_operations", uint64(pw.ID))
		if encodeErr != nil {
			return api.handleServiceError(
				c,
				"Failed to encode pending operation ID",
				services.NewInternalErrorf("error encoding pending operation ID: %v", encodeErr),
				dict,
			)
		}
		entry := fiber.Map{
			"id":               pwSqid,
			"tool_name":        pw.ToolName,
			"risk":             pw.Risk,
			"capability":       pw.Capability,
			"approval_preview": pw.ApprovalPreview,
			"repository":       pw.Repository.Slug,
			"path":             pw.Path,
			"ref":              pw.Ref,
			"operation":        pw.Operation,
			"content_preview":  pw.ContentPreview,
			"patch_json":       pw.PatchJSON,
			"commit_message":   pw.CommitMessage,
			"status":           pw.Status,
			"created_at":       pw.CreatedAt,
		}
		if pw.ReviewedBy != nil {
			if reviewedByResponse, formatErr := formatter.FormatUserResponse(pw.ReviewedBy, api.SQIDManager); formatErr == nil {
				entry["reviewed_by"] = reviewedByResponse
			}
			entry["reviewed_at"] = pw.ReviewedAt
		}
		formattedWrites = append(formattedWrites, entry)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: fiber.Map{
			"pending_operations": formattedWrites,
			"total":              total,
			"limit":              limit,
			"offset":             offset,
		},
	})
}

// AIApplicationPendingOperationShow godoc
// @Summary Get a specific pending operation
// @Description Get details of a specific pending operation
// @Tags ai-applications
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param ai_application_slug path string true "AI application slug"
// @Param pending_operation path string true "Pending operation ID"
// @Success 200 {object} irminmodels.IrminAPIResponse "Pending operation retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/ai-applications/{ai_application_slug}/pending-operations/{pending_operation} [get]
func (api *APIControllers) AIApplicationPendingOperationShow(c fiber.Ctx) error {
	_, dict, _, _, err := api.validateWorkspaceParams(c)
	if err != nil {
		return api.handleServiceError(c, "Error validating workspace parameters", err, dict)
	}

	// Get the AI application from locals
	aiApplication, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return api.handleServiceError(
			c,
			"Error getting locals for AIApplicationPendingOperationShow",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Decode pending operation ID
	pendingOperationSqid := c.Params("pending_operation")
	pendingOperationID, decodeErr := api.SQIDManager.Decode("ai_application_pending_operations", pendingOperationSqid)
	if decodeErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Invalid ID",
		})
	}

	// Get pending operation
	pendingOperation, dbErr := api.DB.GetAIApplicationPendingOperationByID(uint(pendingOperationID))
	if dbErr != nil {
		return c.Status(fiber.StatusNotFound).JSON(irminmodels.IrminAPIResponse{
			Message: "Resource not found",
		})
	}

	// Verify it belongs to this AI Application
	if pendingOperation.AIApplicationID != aiApplication.ID {
		return c.Status(fiber.StatusNotFound).JSON(irminmodels.IrminAPIResponse{
			Message: "Resource not found",
		})
	}

	entry := fiber.Map{
		"id":               pendingOperationSqid,
		"tool_name":        pendingOperation.ToolName,
		"risk":             pendingOperation.Risk,
		"capability":       pendingOperation.Capability,
		"approval_preview": pendingOperation.ApprovalPreview,
		"repository":       pendingOperation.Repository.Slug,
		"path":             pendingOperation.Path,
		"ref":              pendingOperation.Ref,
		"operation":        pendingOperation.Operation,
		"content_preview":  pendingOperation.ContentPreview,
		"patch_json":       pendingOperation.PatchJSON,
		"commit_message":   pendingOperation.CommitMessage,
		"status":           pendingOperation.Status,
		"execution_error":  pendingOperation.ExecutionError,
		"created_at":       pendingOperation.CreatedAt,
	}
	if pendingOperation.ReviewedBy != nil {
		if reviewedByResponse, formatErr := formatter.FormatUserResponse(pendingOperation.ReviewedBy, api.SQIDManager); formatErr == nil {
			entry["reviewed_by"] = reviewedByResponse
		}
		entry["reviewed_at"] = pendingOperation.ReviewedAt
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: entry,
	})
}

// AIApplicationPendingOperationApprove godoc
// @Summary Approve a pending operation
// @Description Approve a pending operation, executing the write
// @Tags ai-applications
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param ai_application_slug path string true "AI application slug"
// @Param pending_operation path string true "Pending operation ID"
// @Success 200 {object} irminmodels.IrminAPIResponse "Pending operation completed"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Not found"
// @Failure 409 {object} irminmodels.IrminAPIResponse "Conflict - already processed"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/ai-applications/{ai_application_slug}/pending-operations/{pending_operation}/approve [post]
func (api *APIControllers) AIApplicationPendingOperationApprove(c fiber.Ctx) error {
	_, dict, user, _, err := api.validateWorkspaceParams(c)
	if err != nil {
		return api.handleServiceError(c, "Error validating workspace parameters", err, dict)
	}

	// Get the AI application from locals
	aiApplication, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return api.handleServiceError(
			c,
			"Error getting locals for AIApplicationPendingOperationApprove",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Decode pending operation ID
	pendingOperationSqid := c.Params("pending_operation")
	pendingOperationID, decodeErr := api.SQIDManager.Decode("ai_application_pending_operations", pendingOperationSqid)
	if decodeErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Invalid ID",
		})
	}

	// Get pending operation
	pendingOperation, dbErr := api.DB.GetAIApplicationPendingOperationByID(uint(pendingOperationID))
	if dbErr != nil {
		return c.Status(fiber.StatusNotFound).JSON(irminmodels.IrminAPIResponse{
			Message: "Resource not found",
		})
	}

	// Verify it belongs to this AI Application
	if pendingOperation.AIApplicationID != aiApplication.ID {
		return c.Status(fiber.StatusNotFound).JSON(irminmodels.IrminAPIResponse{
			Message: "Resource not found",
		})
	}

	// Atomically claim this pending operation before executing it.
	// This prevents race conditions where concurrent requests could both execute the same write
	updated, updateErr := api.DB.UpdatePendingOperationStatusAtomic(
		uint(pendingOperationID),
		db.PendingOperationStatusPending,
		db.PendingOperationStatusExecuting,
		&user.ID,
	)
	if updateErr != nil {
		api.Logger.Error("Failed to update pending operation status", "error", updateErr)
		return c.Status(fiber.StatusInternalServerError).JSON(irminmodels.IrminAPIResponse{
			Message: "Failed to process pending operation",
		})
	}
	if !updated {
		// Status was already changed by another request
		return c.Status(fiber.StatusConflict).JSON(irminmodels.IrminAPIResponse{
			Message: "Pending operation has already been processed",
		})
	}

	// Execute the pending operation (status is now safely claimed)
	executor := services.NewAIAppToolExecutor(aiApplication, api.Services)
	result, execErr := executor.ExecutePendingOperation(c.Context(), pendingOperation)
	if execErr != nil {
		api.Logger.Error("Failed to execute pending operation", "error", execErr)
		// A claimed operation is terminal even on failure, preventing duplicate side effects.
		if failErr := api.DB.FailPendingOperation(uint(pendingOperationID), execErr.Error()); failErr != nil {
			api.Logger.Error("Failed to record pending operation failure", "error", failErr)
		}
		// Return appropriate status based on error type
		switch {
		case errors.Is(execErr, services.ErrWriteNotEnabled),
			errors.Is(execErr, services.ErrFileUploadNotEnabled),
			errors.Is(execErr, services.ErrFileUpdateNotEnabled),
			errors.Is(execErr, services.ErrPatchNotEnabled),
			errors.Is(execErr, services.ErrWriteAccessDenied),
			errors.Is(execErr, services.ErrPathNotInDataSources):
			return c.Status(fiber.StatusForbidden).JSON(irminmodels.IrminAPIResponse{
				Message: execErr.Error(),
			})
		case errors.Is(execErr, services.ErrCommitMessageRequired),
			errors.Is(execErr, services.ErrInvalidUnifiedPath):
			return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
				Message: execErr.Error(),
			})
		default:
			return c.Status(fiber.StatusInternalServerError).JSON(irminmodels.IrminAPIResponse{
				Message: "Failed to execute pending operation",
			})
		}
	}

	completed, completeErr := api.DB.UpdatePendingOperationStatusAtomic(
		uint(pendingOperationID),
		db.PendingOperationStatusExecuting,
		db.PendingOperationStatusCompleted,
		&user.ID,
	)
	if completeErr != nil || !completed {
		api.Logger.Error("Failed to complete pending operation", "error", completeErr)
		return c.Status(fiber.StatusConflict).JSON(irminmodels.IrminAPIResponse{
			Message: "Pending operation execution status changed unexpectedly",
		})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: fiber.Map{
			"id":        pendingOperationSqid,
			"status":    db.PendingOperationStatusCompleted,
			"message":   "Pending operation completed",
			"operation": pendingOperation.Operation,
			"path":      result.Path,
			"committed": result.Committed,
			"commit_id": result.CommitID,
		},
	})
}

// AIApplicationPendingOperationReject godoc
// @Summary Reject a pending operation
// @Description Reject a pending operation
// @Tags ai-applications
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param ai_application_slug path string true "AI application slug"
// @Param pending_operation path string true "Pending operation ID"
// @Success 200 {object} irminmodels.IrminAPIResponse "Pending operation rejected"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Not found"
// @Failure 409 {object} irminmodels.IrminAPIResponse "Conflict - already processed"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/ai-applications/{ai_application_slug}/pending-operations/{pending_operation}/reject [post]
func (api *APIControllers) AIApplicationPendingOperationReject(c fiber.Ctx) error {
	_, dict, user, _, err := api.validateWorkspaceParams(c)
	if err != nil {
		return api.handleServiceError(c, "Error validating workspace parameters", err, dict)
	}

	// Get the AI application from locals
	aiApplication, ok := c.Locals("ai_application").(*db.AIApplication)
	if !ok {
		return api.handleServiceError(
			c,
			"Error getting locals for AIApplicationPendingOperationReject",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Decode pending operation ID
	pendingOperationSqid := c.Params("pending_operation")
	pendingOperationID, decodeErr := api.SQIDManager.Decode("ai_application_pending_operations", pendingOperationSqid)
	if decodeErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(irminmodels.IrminAPIResponse{
			Message: "Invalid ID",
		})
	}

	// Get pending operation
	pendingOperation, dbErr := api.DB.GetAIApplicationPendingOperationByID(uint(pendingOperationID))
	if dbErr != nil {
		return c.Status(fiber.StatusNotFound).JSON(irminmodels.IrminAPIResponse{
			Message: "Resource not found",
		})
	}

	// Verify it belongs to this AI Application
	if pendingOperation.AIApplicationID != aiApplication.ID {
		return c.Status(fiber.StatusNotFound).JSON(irminmodels.IrminAPIResponse{
			Message: "Resource not found",
		})
	}

	// Atomically update status from pending to rejected
	// This prevents race conditions with concurrent approve requests
	updated, updateErr := api.DB.UpdatePendingOperationStatusAtomic(
		uint(pendingOperationID),
		db.PendingOperationStatusPending,
		db.PendingOperationStatusRejected,
		&user.ID,
	)
	if updateErr != nil {
		api.Logger.Error("Failed to update pending operation status", "error", updateErr)
		return c.Status(fiber.StatusInternalServerError).JSON(irminmodels.IrminAPIResponse{
			Message: "Failed to reject pending operation",
		})
	}
	if !updated {
		// Status was already changed by another request (e.g., approved or rejected)
		return c.Status(fiber.StatusConflict).JSON(irminmodels.IrminAPIResponse{
			Message: "Pending operation has already been processed",
		})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: fiber.Map{
			"id":      pendingOperationSqid,
			"status":  db.PendingOperationStatusRejected,
			"message": "Pending operation rejected",
		},
	})
}
