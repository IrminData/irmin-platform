package controllers

import (
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
//nolint:dupl // this function is not a duplicate, but follows the same pattern as the other index functions
func (api *APIControllers) UsersIndex(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get all users in the workspace.
	workspaceUsers, getUsersErr := api.DB.GetUsersInWorkspace(workspace.ID)
	if getUsersErr != nil {
		api.Logger.Error("Error fetching users", "error", getUsersErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Filter users based on user permissions
	filteredUsers, err := lib.IsAllowedFilter(
		api.permissionService,
		user,
		workspace,
		db.PolicyResourceUser,
		db.PolicyActionRead,
		workspaceUsers,
		func(u db.WorkspaceUser) uint { return u.UserID },
	)
	if err != nil {
		api.Logger.Error("Error filtering users by permissions", "error", err)
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

	// Make sure the deleted user is not the user making the request
	if user.ID == workspaceMember.UserID {
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "cannot_remove_self_from_workspace")},
		})
	}

	// Make sure the deleted user is not the workspace owner
	if workspace.OwnerID == workspaceMember.UserID {
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "cannot_remove_owner_from_workspace")},
		})
	}

	// Remove the user from the workspace
	txErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return api.DB.RemoveUserFromWorkspace(tx, workspaceMember.UserID, workspace.ID)
	})
	if txErr != nil {
		api.Logger.Error("Error removing user from workspace", "error", txErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("User %s removed from workspace", workspaceMember.User.Email),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

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

	// Parse and validate roles
	newRoles := parseAndValidateRoles(api, req.Roles)

	// Update user roles
	txErr := api.DB.Transaction(func(tx *gorm.DB) error {
		var updateRolesErr error
		workspaceMember, updateRolesErr = api.DB.UpdateWorkspaceUserRoles(
			tx,
			workspaceMember.UserID,
			workspace.ID,
			newRoles,
		)
		return updateRolesErr
	})
	if txErr != nil {
		api.Logger.Error("Error updating workspace user roles", "error", txErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Refetch updated user
	workspaceMember, err = api.DB.GetWorkspaceUser(workspace.ID, workspaceMember.UserID)
	if err != nil {
		api.Logger.Error("Error fetching workspace user", "error", err)
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

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type: db.LogEventTypeUpdate,
		Description: fmt.Sprintf(
			"User %s roles updated to %s",
			workspaceMember.User.Email,
			strings.Join(req.Roles, ","),
		),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workspace_member_updated"),
		Data:    userResponse,
	})
}

// parseAndValidateRoles converts string roles to UserWorkspaceRole slice.
func parseAndValidateRoles(api *APIControllers, requestedRoles []string) []uint {
	var newRoles []uint

	for _, role := range requestedRoles {
		roleID, err := api.SQIDManager.Decode("roles", role)
		if err != nil {
			api.Logger.Error("Error decoding role", "error", err)
		} else {
			newRoles = append(newRoles, uint(roleID))
		}
	}

	return newRoles
}
