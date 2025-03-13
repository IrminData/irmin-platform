package controllers

import (
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	"irmin-api/db"

	"github.com/gofiber/fiber/v3"
)

func WorkspacesIndex(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)

	// Get the workspaces for the user.
	userWorkspaces, err := db.GetUserWorkspaces(user.ID)
	if err != nil {
		log.Printf("Error retrieving workspaces: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Map workspaces to workspace response.
	workspacesResponse := make([]db.WorkspaceResponse, len(userWorkspaces))
	for i, userWorkspace := range userWorkspaces {
		workspace := userWorkspace.Workspace
		sqid, _ := utils.EncodeSqids("workspaces", uint64(workspace.ID))
		workspacesResponse[i] = db.WorkspaceResponse{
			ID:          sqid,
			Name:        workspace.Name,
			Slug:        workspace.Slug,
			Description: workspace.Description,
		}
	}

	// Return the workspaces.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Data: workspacesResponse,
	})
}

func WorkspacesStore(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)

	// Parse the request body.
	fields, err := utils.ParseFormFields(c, []string{"name"}, []string{"description"})
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Create the workspace.
	newWorkspace, err := db.CreateWorkspace(&db.Workspace{
		Name:        fields["name"],
		Slug:        utils.Slugify(fields["name"]),
		Description: fields["description"],
		OwnerID:     user.ID,
	})
	if err != nil {
		log.Printf("Error creating workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Add the user to the workspace.
	_, err = db.AddUserToWorkspace(user.ID, newWorkspace.ID, []db.UserWorkspaceRole{db.RoleAdmin})
	if err != nil {
		log.Printf("Error adding user to workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Create SQID for the workspace.
	sqid, err := utils.EncodeSqids("workspaces", uint64(newWorkspace.ID))
	if err != nil {
		log.Printf("Error encoding SQID: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Format the response.
	response := db.WorkspaceResponse{
		ID:          sqid,
		Name:        newWorkspace.Name,
		Slug:        newWorkspace.Slug,
		Description: newWorkspace.Description,
	}

	// Return the new workspace.
	return utils.WriteResponse(c, fiber.StatusCreated, utils.IrminAPIResponse{
		Message: dict.T("workspace_created"),
		Data:    response,
	})
}

func WorkspacesShow(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)

	// Parse the workspace slug from the request URL.
	workspaceSlug := c.Params("workspace")
	if workspaceSlug == "" {
		log.Printf("No workspace selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Get the workspace by its slug.
	workspace, err := db.GetWorkspaceBySlug(workspaceSlug)
	if err != nil {
		log.Printf("Error retrieving workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Check if the user is a member of the workspace.
	isMember, err := db.IsUserInWorkspace(user.ID, workspace.ID)
	if err != nil {
		log.Printf("Error checking user membership: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}
	if !isMember {
		log.Printf("User not a member of the workspace")
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
	}

	// Create the workspace response.
	sqid, _ := utils.EncodeSqids("workspaces", uint64(workspace.ID))
	ownerSqid, _ := utils.EncodeSqids("users", uint64(workspace.Owner.ID))
	workspaceUsers := make([]db.UserResponse, len(workspace.Users))
	for i, userWorkspace := range workspace.Users {
		userSqid, _ := utils.EncodeSqids("users", uint64(userWorkspace.User.ID))
		workspaceUsers[i] = db.UserResponse{
			ID:             userSqid,
			FirstName:      userWorkspace.User.FirstName,
			LastName:       userWorkspace.User.LastName,
			Email:          userWorkspace.User.Email,
			Phone:          userWorkspace.User.Phone,
			Company:        userWorkspace.User.Company,
			ProfilePicture: userWorkspace.User.ProfilePicture,
			Roles:          userWorkspace.Roles,
		}
	}
	workspaceResponse := db.WorkspaceResponse{
		ID:          sqid,
		Name:        workspace.Name,
		Slug:        workspace.Slug,
		Description: workspace.Description,
		Users:       workspaceUsers,
		Owner: &db.UserResponse{
			ID:             ownerSqid,
			FirstName:      workspace.Owner.FirstName,
			LastName:       workspace.Owner.LastName,
			Email:          workspace.Owner.Email,
			Phone:          workspace.Owner.Phone,
			Company:        workspace.Owner.Company,
			ProfilePicture: workspace.Owner.ProfilePicture,
		},
	}

	// Return the workspace.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Data: workspaceResponse,
	})
}

func WorkspacesUpdate(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)

	// Parse the workspace slug from the request URL.
	workspaceSlug := c.Params("workspace")
	if workspaceSlug == "" {
		log.Printf("No workspace selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Get the workspace by its slug.
	workspace, err := db.GetWorkspaceBySlug(workspaceSlug)
	if err != nil {
		log.Printf("Error retrieving workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Check if the user is a member of the workspace.
	isMember, err := db.IsUserInWorkspace(user.ID, workspace.ID)
	if err != nil {
		log.Printf("Error checking user membership: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}
	if !isMember {
		log.Printf("User not a member of the workspace")
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
	}

	// Parse the request body.
	fields, err := utils.ParseFormFields(c, []string{"name", "description"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Update the workspace.
	updatedWorkspace, err := db.UpdateWorkspace(workspace.ID, map[string]interface{}{
		"name":        fields["name"],
		"slug":        utils.Slugify(fields["name"]),
		"description": fields["description"],
	})
	if err != nil {
		log.Printf("Error updating workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Create the workspace response.
	sqid, _ := utils.EncodeSqids("workspaces", uint64(updatedWorkspace.ID))
	workspaceResponse := db.WorkspaceResponse{
		ID:          sqid,
		Name:        updatedWorkspace.Name,
		Slug:        updatedWorkspace.Slug,
		Description: updatedWorkspace.Description,
	}

	// Return the updated workspace.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("workspace_updated"),
		Data:    workspaceResponse,
	})
}

func WorkspacesDestroy(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)

	// Parse the workspace slug from the request URL.
	workspaceSlug := c.Params("workspace")
	if workspaceSlug == "" {
		log.Printf("No workspace selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Get the workspace by its slug.
	workspace, err := db.GetWorkspaceBySlug(workspaceSlug)
	if err != nil {
		log.Printf("Error retrieving workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Check if the workspace owner is deleting the workspace.
	if workspace.OwnerID != user.ID {
		log.Printf("User is not the owner of the workspace")
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
	}

	// Delete the workspace.
	err = db.DeleteWorkspace(workspace.ID)
	if err != nil {
		log.Printf("Error deleting workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Return a success message.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("workspace_deleted"),
	})
}

func TransferWorkspaceOwnership(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)

	// Parse the workspace slug from the request URL.
	workspaceSlug := c.Params("workspace")
	if workspaceSlug == "" {
		log.Printf("No workspace selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Get the workspace by its slug.
	workspace, err := db.GetWorkspaceBySlug(workspaceSlug)
	if err != nil {
		log.Printf("Error retrieving workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Check if the workspace owner is deleting the workspace.
	if workspace.OwnerID != user.ID {
		log.Printf("User is not the owner of the workspace")
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
	}

	// Parse the request body.
	fields, err := utils.ParseFormFields(c, []string{"new_owner_id"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Get the ID of the new owner.
	newOwnerID, err := utils.DecodeSqids("users", fields["new_owner_id"])
	if err != nil {
		log.Printf("Error decoding SQID: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Update the workspace owner ID.
	updatedWorkspace, err := db.UpdateWorkspace(workspace.ID, map[string]interface{}{
		"owner_id": newOwnerID,
	})
	if err != nil {
		log.Printf("Error updating workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Create the workspace response.
	sqid, _ := utils.EncodeSqids("workspaces", uint64(updatedWorkspace.ID))
	workspaceResponse := db.WorkspaceResponse{
		ID:          sqid,
		Name:        updatedWorkspace.Name,
		Slug:        updatedWorkspace.Slug,
		Description: updatedWorkspace.Description,
		Owner: &db.UserResponse{
			ID:             fields["new_owner_id"],
			FirstName:      updatedWorkspace.Owner.FirstName,
			LastName:       updatedWorkspace.Owner.LastName,
			Email:          updatedWorkspace.Owner.Email,
			Phone:          updatedWorkspace.Owner.Phone,
			Company:        updatedWorkspace.Owner.Company,
			ProfilePicture: updatedWorkspace.Owner.ProfilePicture,
		},
	}

	// Return the updated workspace.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("workspace_ownership_transferred"),
		Data:    workspaceResponse,
	})
}

func LeaveWorkspace(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)

	// Parse the workspace slug from the request URL.
	workspaceSlug := c.Params("workspace")
	if workspaceSlug == "" {
		log.Printf("No workspace selected")
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Get the workspace by its slug.
	workspace, err := db.GetWorkspaceBySlug(workspaceSlug)
	if err != nil {
		log.Printf("Error retrieving workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Make sure that the user is not the last user in the workspace.
	if len(workspace.Users) == 1 {
		log.Printf("User is the last user in the workspace")
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("workspace_cannot_leave_last")},
		})
	}

	// Make sure the user is not the owner of the workspace.
	if workspace.OwnerID == user.ID {
		log.Printf("User is the owner of the workspace")
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("workspace_cannot_leave_last")},
		})
	}

	// Leave the workspace.
	err = db.RemoveUserFromWorkspace(user.ID, workspace.ID)
	if err != nil {
		log.Printf("Error leaving workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occured")},
		})
	}

	// Return a success message.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("workspace_left"),
	})
}
