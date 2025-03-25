package controllers

import (
	"irmin-api/lib"
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
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Map workspaces to workspace response.
	var workspacesResponse []db.WorkspaceResponse
	for _, userWorkspace := range userWorkspaces {
		workspace := userWorkspace.Workspace
		sqid, _ := utils.EncodeSqids("workspaces", uint64(workspace.ID))
		workspacesResponse = append(workspacesResponse, db.WorkspaceResponse{
			ID:          sqid,
			Name:        workspace.Name,
			Slug:        workspace.Slug,
			Description: workspace.Description,
		})
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
			Errors: []string{dict.T("invalid_request")},
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
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Add the user to the workspace.
	_, err = db.AddUserToWorkspace(user.ID, newWorkspace.ID, []db.UserWorkspaceRole{db.RoleAdmin})
	if err != nil {
		log.Printf("Error adding user to workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Create a bucket folder for the editor files of the workspace.
	bucket, err := lib.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	defer bucket.Close()
	key := "editor/" + newWorkspace.Slug + "/"
	err = bucket.WritePath(c.Context(), key, "")
	if err != nil {
		log.Printf("Error creating workspace editor items folder object: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Create SQID for the workspace.
	sqid, err := utils.EncodeSqids("workspaces", uint64(newWorkspace.ID))
	if err != nil {
		log.Printf("Error encoding SQID: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
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
	// Get the workspace from the request context.
	workspace := c.Locals("workspace").(*db.Workspace)

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
	// Get the dictionary and workspace from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Parse the request body.
	fields, err := utils.ParseFormFields(c, []string{"name", "description"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Update the workspace.
	updatedWorkspace, err := db.UpdateWorkspace(workspace.ID, map[string]interface{}{
		"name":        fields["name"],
		"description": fields["description"],
	})
	if err != nil {
		log.Printf("Error updating workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
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
	// Get the dictionary, workspace, and user from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Check if the workspace owner is deleting the workspace.
	if workspace.OwnerID != user.ID {
		log.Printf("User is not the owner of the workspace")
		return utils.WriteResponse(c, fiber.StatusForbidden, utils.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
	}

	// Delete the workspace.
	err := db.DeleteWorkspace(workspace.ID)
	if err != nil {
		log.Printf("Error deleting workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Create bucket client
	bucket, err := lib.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	defer bucket.Close()

	// Delete the workspace editor items folder.
	key := "editor/" + workspace.Slug + "/"
	err = bucket.DeletePath(c.Context(), key)
	if err != nil {
		log.Printf("Error deleting workspace editor items folder: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// TODO: Delete all related data (repositories, etc.)

	// Return a success message.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("workspace_deleted"),
	})
}

func TransferWorkspaceOwnership(c fiber.Ctx) error {
	// Get the dictionary, workspace, and user from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)

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
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Get the ID of the new owner.
	newOwnerID, err := utils.DecodeSqids("users", fields["new_owner_id"])
	if err != nil {
		log.Printf("Error decoding SQID: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Update the workspace owner ID.
	updatedWorkspace, err := db.UpdateWorkspace(workspace.ID, map[string]interface{}{
		"owner_id": newOwnerID,
	})
	if err != nil {
		log.Printf("Error updating workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
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
	// Get the dictionary, workspace, and user from the request context.
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)

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
	err := db.RemoveUserFromWorkspace(user.ID, workspace.ID)
	if err != nil {
		log.Printf("Error leaving workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return a success message.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("workspace_left"),
	})
}
