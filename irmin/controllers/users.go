package controllers

import (
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"
	"strings"

	"github.com/gofiber/fiber/v3"
)

func UsersIndex(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Get all users in the workspace.
	workspaceUsers, err := db.GetUsersInWorkspace(workspace.ID)
	if err != nil {
		log.Printf("Error fetching users: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Structure the response.
	var usersResponse []db.UserResponse
	for _, workspaceUser := range workspaceUsers {
		// Format the user response
		userResponse, err := lib.FormatUserResponse(workspaceUser)
		if err != nil {
			log.Printf("Error formatting user: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
				Errors: []string{dict.T("error_occured")},
			})
		}
		// Append the user to the response
		usersResponse = append(usersResponse, *userResponse)
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Data: usersResponse,
	})
}

func UsersShow(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspaceUser := c.Locals("workspace_user").(*db.WorkspaceUser)

	// Format the user response
	userResponse, err := lib.FormatUserResponse(*workspaceUser)
	if err != nil {
		log.Printf("Error formatting user: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Data: *userResponse,
	})
}

func UsersDestroy(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)
	workspaceUser := c.Locals("workspace_user").(*db.WorkspaceUser)

	// Make sure the deleted user is not the user making the request
	if user.ID == workspaceUser.UserID {
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("cannot_remove_self_from_workspace")},
		})
	}

	// Make sure the deleted user is not the workspace owner
	if workspace.OwnerID == workspaceUser.UserID {
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("cannot_remove_owner_from_workspace")},
		})
	}

	// Make sure the person removing the user has the necessary permissions
	allowed := workspaceUser.UserID == workspace.OwnerID // Owner can remove users from the workspace
	for _, userWorkspace := range user.Workspaces {
		if userWorkspace.WorkspaceID == workspace.ID {
			for _, role := range userWorkspace.Roles {
				if role == db.RoleAdmin {
					allowed = true // Admins can remove users from the workspace
					break
				}
			}
		}
	}
	if !allowed {
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("insufficient_permissions")},
		})
	}

	// Remove the user from the workspace
	if err := db.RemoveUserFromWorkspace(workspaceUser.UserID, workspace.ID); err != nil {
		log.Printf("Error removing user from workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusNoContent, utils.IrminAPIResponse{
		Message: dict.T("member_removed_from_workspace"),
	})
}

func UsersUpdate(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)
	workspaceUser := c.Locals("workspace_user").(*db.WorkspaceUser)

	// Make sure the updated user is not the user making the request
	if user.ID == workspaceUser.UserID {
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("cannot_update_self_in_workspace")},
		})
	}

	// Make sure the updated user is not the workspace owner
	if workspace.OwnerID == workspaceUser.UserID {
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("cannot_update_owner_of_workspace")},
		})
	}

	// Make sure the person removing the user has the necessary permissions
	allowed := workspaceUser.UserID == workspace.OwnerID // Owner can modify users in the workspace
	for _, userWorkspace := range user.Workspaces {
		if userWorkspace.WorkspaceID == workspace.ID {
			for _, role := range userWorkspace.Roles {
				if role == db.RoleAdmin {
					allowed = true // Admins can modify users in the workspace
					break
				}
			}
		}
	}
	if !allowed {
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("insufficient_permissions")},
		})
	}

	// Parse the form fields
	fields, err := utils.ParseFormFields(c, []string{"roles"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Construct the new roles slice
	requestedRoles := strings.Split(fields["roles"], ",")
	var newRoles []db.UserWorkspaceRole
	for _, role := range requestedRoles {
		if role == "admin" {
			newRoles = append(newRoles, db.RoleAdmin)
			continue
		}
		if role == "editor" {
			newRoles = append(newRoles, db.RoleEditor)
			continue
		}
		if role == "viewer" {
			newRoles = append(newRoles, db.RoleViewer)
			continue
		}
	}

	// Update the user roles in the workspace
	workspaceUser, err = db.UpdateWorkspaceUserRoles(workspaceUser.UserID, workspace.ID, newRoles)
	if err != nil {
		log.Printf("Error updating workspace user roles: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Refetch the workspace user
	workspaceUser, err = db.GetWorkspaceUser(workspace.ID, workspaceUser.UserID)
	if err != nil {
		log.Printf("Error fetching workspace user: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Format the updated user response
	userResponse, err := lib.FormatUserResponse(*workspaceUser)
	if err != nil {
		log.Printf("Error formatting user: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Return the updated user
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("workspace_member_updated"),
		Data:    userResponse,
	})
}
