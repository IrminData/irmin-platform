package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

//nolint:dupl // this function is not a duplicate, but follows the same pattern as the other index functions
func (api *APIControllers) UsersIndex(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !workspaceOk || !userOk {
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
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: usersResponse,
	})
}

func (api *APIControllers) UsersShow(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspaceMember, workspaceMemberOk := c.Locals("workspace_member").(*db.WorkspaceUser)

	if !dictOk || !workspaceMemberOk {
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
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: *userResponse,
	})
}

func (api *APIControllers) UsersDestroy(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	workspaceMember, workspaceMemberOk := c.Locals("workspace_member").(*db.WorkspaceUser)

	if !dictOk || !userOk || !workspaceOk || !workspaceMemberOk {
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
	if removeUserFromWorkspaceErr := api.DB.RemoveUserFromWorkspace(workspaceMember.UserID, workspace.ID); removeUserFromWorkspaceErr != nil {
		api.Logger.Error("Error removing user from workspace", "error", removeUserFromWorkspaceErr)
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
	return utils.WriteResponse(c, fiber.StatusNoContent, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "member_removed_from_workspace"),
	})
}

func (api *APIControllers) UsersUpdate(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	workspaceMember, workspaceMemberOk := c.Locals("workspace_member").(*db.WorkspaceUser)

	if !dictOk || !userOk || !workspaceOk || !workspaceMemberOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
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
	newRoles := parseAndValidateRoles(api, fields["roles"])

	// Update user roles
	workspaceMember, err = api.DB.UpdateWorkspaceUserRoles(workspaceMember.UserID, workspace.ID, newRoles)
	if err != nil {
		api.Logger.Error("Error updating workspace user roles", "error", err)
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

// parseAndValidateRoles converts string roles to UserWorkspaceRole slice.
func parseAndValidateRoles(api *APIControllers, rolesStr string) []uint {
	requestedRoles := strings.Split(rolesStr, ",")
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
