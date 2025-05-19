package controllers

import (
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"strings"

	"slices"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

//nolint:dupl // this function is not a duplicate, but follows the same pattern as the other index functions
func (api *APIControllers) UsersIndex(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !dictOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get all users in the workspace.
	workspaceUsers, getUsersInWorkspaceErr := api.DB.GetUsersInWorkspace(workspace.ID)
	if getUsersInWorkspaceErr != nil {
		api.Logger.Error("Error fetching users", "error", getUsersInWorkspaceErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Structure the response.
	usersResponse, formatErr := formatter.FormatIndexResponse(
		workspaceUsers,
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
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: usersResponse,
	})
}

func (api *APIControllers) UsersShow(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspaceUser, workspaceUserOk := c.Locals("workspace_user").(*db.WorkspaceUser)

	if !dictOk || !workspaceUserOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Format the user response
	userResponse, formatErr := formatter.FormatWorkspaceUserResponse(workspaceUser, api.SQIDManager)
	if formatErr != nil {
		api.Logger.Error("Error formatting user", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: *userResponse,
	})
}

func (api *APIControllers) UsersDestroy(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	workspaceUser, workspaceUserOk := c.Locals("workspace_user").(*db.WorkspaceUser)

	if !dictOk || !userOk || !workspaceOk || !workspaceUserOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Make sure the deleted user is not the user making the request
	if user.ID == workspaceUser.UserID {
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "cannot_remove_self_from_workspace")},
		})
	}

	// Make sure the deleted user is not the workspace owner
	if workspace.OwnerID == workspaceUser.UserID {
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "cannot_remove_owner_from_workspace")},
		})
	}

	// Make sure the person removing the user has the necessary permissions
	allowed := user.ID == workspace.OwnerID // Owner can modify users in the workspace
	for _, userWorkspace := range user.Workspaces {
		if userWorkspace.WorkspaceID == workspace.ID {
			if slices.Contains(userWorkspace.Roles, db.RoleAdmin) {
				allowed = true
			}
		}
	}
	if !allowed {
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "insufficient_permissions")},
		})
	}

	// Remove the user from the workspace
	if removeUserFromWorkspaceErr := api.DB.RemoveUserFromWorkspace(workspaceUser.UserID, workspace.ID); removeUserFromWorkspaceErr != nil {
		api.Logger.Error("Error removing user from workspace", "error", removeUserFromWorkspaceErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("User %s removed from workspace", workspaceUser.User.Email),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusNoContent, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "member_removed_from_workspace"),
	})
}

func (api *APIControllers) UsersUpdate(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	workspaceUser, workspaceUserOk := c.Locals("workspace_user").(*db.WorkspaceUser)

	if !dictOk || !userOk || !workspaceOk || !workspaceUserOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Validate permissions
	if err := api.validateUserUpdatePermissions(user, workspace, workspaceUser); err != nil {
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, err.Error())},
		})
	}

	// Parse form fields
	fields, err := utils.ParseFormFields(c, []string{"roles"}, nil)
	if err != nil {
		api.Logger.Error("Error parsing form fields", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Parse and validate roles
	newRoles := parseAndValidateRoles(fields["roles"])

	// Update user roles
	workspaceUser, err = api.DB.UpdateWorkspaceUserRoles(workspaceUser.UserID, workspace.ID, newRoles)
	if err != nil {
		api.Logger.Error("Error updating workspace user roles", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Refetch updated user
	workspaceUser, err = api.DB.GetWorkspaceUser(workspace.ID, workspaceUser.UserID)
	if err != nil {
		api.Logger.Error("Error fetching workspace user", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format response
	userResponse, err := formatter.FormatWorkspaceUserResponse(workspaceUser, api.SQIDManager)
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
			workspaceUser.User.Email,
			fields["roles"],
		),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workspace_member_updated"),
		Data:    userResponse,
	})
}

// validateUserUpdatePermissions checks if the current user has permission to update the target user.
func (api *APIControllers) validateUserUpdatePermissions(
	user *db.User,
	workspace *db.Workspace,
	targetUser *db.WorkspaceUser,
) error {
	// Cannot update self
	if user.ID == targetUser.UserID {
		return errors.New("cannot update self")
	}

	// Cannot update workspace owner
	if workspace.OwnerID == targetUser.UserID {
		return errors.New("cannot update workspace owner")
	}

	// Check if user has admin permissions
	allowed := user.ID == workspace.OwnerID // Owner can modify users in the workspace
	for _, userWorkspace := range user.Workspaces {
		if userWorkspace.WorkspaceID == workspace.ID && slices.Contains(userWorkspace.Roles, db.RoleAdmin) {
			allowed = true
			break
		}
	}

	if !allowed {
		return errors.New("insufficient permissions")
	}

	return nil
}

// parseAndValidateRoles converts string roles to UserWorkspaceRole slice.
func parseAndValidateRoles(rolesStr string) []db.UserWorkspaceRole {
	requestedRoles := strings.Split(rolesStr, ",")
	var newRoles []db.UserWorkspaceRole

	for _, role := range requestedRoles {
		switch role {
		case "admin":
			newRoles = append(newRoles, db.RoleAdmin)
		case "editor":
			newRoles = append(newRoles, db.RoleEditor)
		case "viewer":
			newRoles = append(newRoles, db.RoleViewer)
		}
	}

	return newRoles
}
