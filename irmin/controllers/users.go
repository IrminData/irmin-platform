package controllers

import (
	"errors"
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/services"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// UsersIndex godoc
// @Summary List workspace users
// @Description Get all users in the workspace with their roles and permissions (filtered by user permissions)
// @Tags users
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.User} "Users retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/users [get]
//
//nolint:dupl // This is not a duplicate, it's a different endpoint, which functions in a similar way.
func (api *APIControllers) UsersIndex(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get workspace users using the service
	filteredUsers, err := api.Services.ListWorkspaceUsers(c, user, workspace)
	if err != nil {
		api.Logger.Error("Error listing workspace users", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Structure the response.
	usersResponse, formatErr := formatter.FormatIndexResponse(
		filteredUsers,
		formatter.FormatWorkspaceUserResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		api.Logger.Error("Error formatting users", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: usersResponse,
	})
}

// UsersShow godoc
// @Summary Get workspace user details
// @Description Get details of a specific user in the workspace including their roles
// @Tags users
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param user_id path string true "User ID (SQID encoded)"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.User} "User details retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "User not found in workspace"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/users/{user_id} [get]
func (api *APIControllers) UsersShow(c fiber.Ctx) error {
	_, dict, _, _, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the workspace member from locals
	workspaceMember, workspaceMemberOk := c.Locals("workspace_member").(*db.WorkspaceUser)
	if !workspaceMemberOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Format the user response
	userResponse, formatErr := formatter.FormatWorkspaceUserResponse(workspaceMember, api.SQIDManager)
	if formatErr != nil {
		api.Logger.Error("Error formatting user", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: *userResponse,
	})
}

// UsersDestroy godoc
// @Summary Remove user from workspace
// @Description Remove a user from the workspace (cannot remove self or workspace owner)
// @Tags users
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param user_id path string true "User ID (SQID encoded)"
// @Success 204 {object} irminmodels.IrminAPIResponse "User removed from workspace successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - cannot remove self or workspace owner"
// @Failure 404 {object} irminmodels.IrminAPIResponse "User not found in workspace"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/users/{user_id} [delete]
func (api *APIControllers) UsersDestroy(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the workspace member from locals
	workspaceMember, workspaceMemberOk := c.Locals("workspace_member").(*db.WorkspaceUser)
	if !workspaceMemberOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Remove user from workspace using the service
	err = api.Services.RemoveUserFromWorkspace(c, user, workspace, workspaceMember)
	if err != nil {
		api.Logger.Error("Error removing user from workspace", "error", err)
		if errors.Is(err, services.ErrCannotRemoveSelfFromWorkspace) {
			return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "cannot_remove_self_from_workspace")},
			})
		}
		if errors.Is(err, services.ErrCannotRemoveOwnerFromWorkspace) {
			return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "cannot_remove_owner_from_workspace")},
			})
		}
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate workspace users list for all users
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/users", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusNoContent, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "member_removed_from_workspace"),
	})
}

// UsersUpdate godoc
// @Summary Update user roles in workspace
// @Description Update the roles assigned to a user within the workspace
// @Tags users
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param user_id path string true "User ID (SQID encoded)"
// @Param body body irmincore.UpdateUserRolesRequest true "User roles update request"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.User} "User roles updated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid roles data"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - insufficient permissions"
// @Failure 404 {object} irminmodels.IrminAPIResponse "User not found in workspace"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/users/{user_id} [patch]
func (api *APIControllers) UsersUpdate(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the workspace member from locals
	workspaceMember, workspaceMemberOk := c.Locals("workspace_member").(*db.WorkspaceUser)
	if !workspaceMemberOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse and validate the JSON request body
	var req irmincore.UpdateUserRolesRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Update workspace user roles using the service
	workspaceMember, err = api.Services.UpdateWorkspaceUserRoles(c, user, workspace, workspaceMember, req)
	if err != nil {
		api.Logger.Error("Error updating workspace user roles", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format response
	userResponse, err := formatter.FormatWorkspaceUserResponse(workspaceMember, api.SQIDManager)
	if err != nil {
		api.Logger.Error("Error formatting user", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate workspace users list for all users
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/users", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workspace_member_updated"),
		Data:    userResponse,
	})
}
