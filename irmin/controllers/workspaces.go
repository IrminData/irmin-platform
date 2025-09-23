package controllers

import (
	"errors"
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/utils"

	"irmin-api/db"
	"irmin-api/services"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// validateWorkspaceParams validates the common parameters needed for workspace-level operations.
// Returns locale, dict, user, workspace, and an error. Does not require a repository in context.
func (api *APIControllers) validateWorkspaceParams(c fiber.Ctx) (
	string,
	locales.Dictionary,
	*db.User,
	*db.Workspace,
	error,
) {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !localeOk {
		return "", nil, nil, nil, errors.New("locale not found in context")
	}
	if !dictOk {
		return "", nil, nil, nil, errors.New("dictionary not found in context")
	}
	if !userOk {
		return "", nil, nil, nil, errors.New("user not found in context")
	}
	if !workspaceOk {
		return "", nil, nil, nil, errors.New("workspace not found in context")
	}
	return locale, dict, user, workspace, nil
}

// WorkspacesIndex godoc
// @Summary List user workspaces
// @Description Get all workspaces that the authenticated user is a member of
// @Tags workspaces
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.Workspace} "Workspaces retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces [get]
func (api *APIControllers) WorkspacesIndex(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)

	if !dictOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// List the workspaces for the user.
	workspaces, err := api.Services.ListWorkspaces(user)
	if err != nil {
		api.Logger.Error("Error listing workspaces", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the workspaces.
	workspacesResponse, formatWorkspacesResponseErr := formatter.FormatIndexResponse(
		workspaces,
		formatter.FormatWorkspaceResponse,
		api.SQIDManager,
	)
	if formatWorkspacesResponseErr != nil {
		api.Logger.Error("Error formatting workspaces response", "error", formatWorkspacesResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the workspaces.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: workspacesResponse,
	})
}

// WorkspacesStore godoc
// @Summary Create workspace
// @Description Create a new workspace with default settings, policies, and tags (user becomes owner)
// @Tags workspaces
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param body body irmincore.CreateWorkspaceRequest true "Workspace creation request"
// @Success 201 {object} irminmodels.IrminAPIResponse{data=irminmodels.Workspace} "Workspace created successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid workspace data"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 409 {object} irminmodels.IrminAPIResponse "Workspace slug already exists"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces [post]
func (api *APIControllers) WorkspacesStore(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)

	if !dictOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse and validate the JSON request body
	var req irmincore.CreateWorkspaceRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Create the workspace.
	workspace, err := api.Services.CreateWorkspace(c, user, req)
	if err != nil {
		api.Logger.Error("Error creating workspace", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the workspace.
	workspaceResponse, formatWorkspaceResponseErr := formatter.FormatWorkspaceResponse(workspace, api.SQIDManager)
	if formatWorkspaceResponseErr != nil {
		api.Logger.Error("Error formatting workspace response", "error", formatWorkspaceResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate workspace lists and details
	if invalidationErr := irmincache.InvalidatePathPrefixForCurrentUser(c, api.cacheStorage, "/api/v1/workspaces"); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(api.cacheStorage, fmt.Sprintf("/api/v1/workspaces/%s", workspace.Slug)); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the new workspace.
	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workspace_created"),
		Data:    workspaceResponse,
	})
}

// WorkspacesShow godoc
// @Summary Get workspace details
// @Description Get details of a specific workspace that the user has access to
// @Tags workspaces
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Workspace} "Workspace details retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - user not a member of workspace"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug} [get]
func (api *APIControllers) WorkspacesShow(c fiber.Ctx) error {
	_, dict, _, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Create the workspace response.
	workspaceResponse, formatWorkspaceResponseErr := formatter.FormatWorkspaceResponse(workspace, api.SQIDManager)
	if formatWorkspaceResponseErr != nil {
		api.Logger.Error("Error formatting workspace response", "error", formatWorkspaceResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the workspace.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: workspaceResponse,
	})
}

// WorkspacesUpdate godoc
// @Summary Update workspace
// @Description Update workspace properties (name, description) - slug cannot be changed
// @Tags workspaces
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param body body irmincore.UpdateWorkspaceRequest true "Workspace update request"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Workspace} "Workspace updated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid workspace data"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug} [patch]
func (api *APIControllers) WorkspacesUpdate(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse and validate the JSON request body - all fields are optional during update
	var req irmincore.UpdateWorkspaceRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Update the workspace.
	updatedWorkspace, err := api.Services.UpdateWorkspace(user, workspace, req)
	if err != nil {
		api.Logger.Error("Error updating workspace", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the workspace.
	updatedWorkspaceResponse, formatWorkspaceResponseErr := formatter.FormatWorkspaceResponse(
		updatedWorkspace,
		api.SQIDManager,
	)
	if formatWorkspaceResponseErr != nil {
		api.Logger.Error("Error formatting workspace response", "error", formatWorkspaceResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate workspace lists and details
	if invalidationErr := irmincache.InvalidatePathPrefixForCurrentUser(c, api.cacheStorage, "/api/v1/workspaces"); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(api.cacheStorage, fmt.Sprintf("/api/v1/workspaces/%s", workspace.Slug)); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the updated workspace.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workspace_updated"),
		Data:    updatedWorkspaceResponse,
	})
}

// WorkspacesDestroy godoc
// @Summary Delete workspace
// @Description Delete a workspace and all its data (only workspace owner can delete)
// @Tags workspaces
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse "Workspace deleted successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - only workspace owner can delete"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug} [delete]
func (api *APIControllers) WorkspacesDestroy(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Delete the workspace.
	deleteWorkspaceErr := api.Services.DeleteWorkspace(c, user, workspace)
	if deleteWorkspaceErr != nil {
		api.Logger.Error("Error deleting workspace", "error", deleteWorkspaceErr)
		if errors.Is(deleteWorkspaceErr, services.ErrWorkspaceNotOwner) {
			return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "insufficient_permissions")},
			})
		}
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate workspace lists and details
	if invalidationErr := irmincache.InvalidatePathPrefixForCurrentUser(c, api.cacheStorage, "/api/v1/workspaces"); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(api.cacheStorage, fmt.Sprintf("/api/v1/workspaces/%s", workspace.Slug)); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return a success message.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workspace_deleted"),
	})
}

// TransferWorkspaceOwnership godoc
// @Summary Transfer workspace ownership
// @Description Transfer ownership of a workspace to another user (only current owner can transfer)
// @Tags workspaces
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param body body irmincore.TransferOwnershipRequest true "Ownership transfer request"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Workspace} "Ownership transferred successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid new owner or not a workspace member"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - only workspace owner can transfer ownership"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/transfer-ownership [post]
//
//nolint:dupl // This is similar to other transfer endpoints
func (api *APIControllers) TransferWorkspaceOwnership(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse and validate the JSON request body
	var req irmincore.TransferOwnershipRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Transfer the workspace ownership.
	transferredWorkspace, err := api.Services.TransferWorkspaceOwnership(c, user, workspace, req)
	if err != nil {
		api.Logger.Error("Error transferring workspace ownership", "error", err)
		if errors.Is(err, services.ErrWorkspaceNotOwner) {
			return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "insufficient_permissions")},
			})
		}
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the workspace.
	workspaceResponse, formatWorkspaceResponseErr := formatter.FormatWorkspaceResponse(
		transferredWorkspace,
		api.SQIDManager,
	)
	if formatWorkspaceResponseErr != nil {
		api.Logger.Error("Error formatting workspace response", "error", formatWorkspaceResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate workspace details
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(api.cacheStorage, fmt.Sprintf("/api/v1/workspaces/%s", workspace.Slug)); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the updated workspace.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workspace_ownership_transferred"),
		Data:    workspaceResponse,
	})
}

// LeaveWorkspace godoc
// @Summary Leave workspace
// @Description Remove yourself from a workspace (cannot leave if you're the owner or last member)
// @Tags workspaces
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse "Successfully left workspace"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - cannot leave as owner or last member"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/leave [post]
func (api *APIControllers) LeaveWorkspace(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Leave the workspace.
	leaveWorkspaceErr := api.Services.LeaveWorkspace(user, workspace)
	if leaveWorkspaceErr != nil {
		api.Logger.Error("Error leaving workspace", "error", leaveWorkspaceErr)
		if errors.Is(leaveWorkspaceErr, services.ErrWorkspaceOwnerCannotLeave) ||
			errors.Is(leaveWorkspaceErr, services.ErrWorkspaceLastMemberCannotLeave) {
			return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "workspace_cannot_leave_last")},
			})
		}
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate workspace lists, details, and user lists
	if invalidationErr := irmincache.InvalidatePathPrefixForCurrentUser(c, api.cacheStorage, "/api/v1/workspaces"); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(api.cacheStorage, fmt.Sprintf("/api/v1/workspaces/%s", workspace.Slug)); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(api.cacheStorage, fmt.Sprintf("/api/v1/workspaces/%s/users", workspace.Slug)); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return a success message.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workspace_left"),
	})
}
