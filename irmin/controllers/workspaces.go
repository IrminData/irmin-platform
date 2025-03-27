package controllers

import (
	"irmin-api/bucket"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	"irmin-api/db"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
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
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Map workspaces to workspace response.
	var workspacesResponse []irminModels.Workspace
	for _, userWorkspace := range userWorkspaces {
		workspace := userWorkspace.Workspace
		workspaceResponse, err := formatter.FormatWorkspaceResponse(workspace)
		if err != nil {
			log.Printf("Error formatting workspace response: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
				Errors: []string{"error_occurred"},
			})
		}
		workspacesResponse = append(workspacesResponse, *workspaceResponse)
	}

	// Return the workspaces.
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
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
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
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
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Add the user to the workspace.
	_, err = db.AddUserToWorkspace(user.ID, newWorkspace.ID, []db.UserWorkspaceRole{db.RoleAdmin})
	if err != nil {
		log.Printf("Error adding user to workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Create a bucket folder for the editor files of the workspace.
	bucket, err := bucket.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	defer bucket.Close()
	key := "editor/" + newWorkspace.Slug + "/"
	err = bucket.WritePath(c.Context(), key, "")
	if err != nil {
		log.Printf("Error creating workspace editor items folder object: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Format the response.
	workspaceResponse, err := formatter.FormatWorkspaceResponse(*newWorkspace)
	if err != nil {
		log.Printf("Error formatting workspace response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{"error_occurred"},
		})
	}

	// Return the new workspace.
	return utils.WriteResponse(c, fiber.StatusCreated, irminModels.IrminAPIResponse{
		Message: dict.T("workspace_created"),
		Data:    workspaceResponse,
	})
}

func WorkspacesShow(c fiber.Ctx) error {
	// Get the workspace from the request context.
	workspace := c.Locals("workspace").(*db.Workspace)

	// Create the workspace response.
	workspaceResponse, err := formatter.FormatWorkspaceResponse(*workspace)
	if err != nil {
		log.Printf("Error formatting workspace response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{"error_occurred"},
		})
	}

	// Return the workspace.
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
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
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Update the workspace.
	updatedWorkspace, err := db.UpdateWorkspace(workspace.ID, map[string]any{
		"name":        fields["name"],
		"description": fields["description"],
	})
	if err != nil {
		log.Printf("Error updating workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Create the workspace response.
	workspaceResponse, err := formatter.FormatWorkspaceResponse(*updatedWorkspace)
	if err != nil {
		log.Printf("Error formatting workspace response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{"error_occurred"},
		})
	}

	// Return the updated workspace.
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
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
		return utils.WriteResponse(c, fiber.StatusForbidden, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
	}

	// Delete the workspace.
	err := db.DeleteWorkspace(workspace.ID)
	if err != nil {
		log.Printf("Error deleting workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Create bucket client
	bucket, err := bucket.CreateBucketClient()
	if err != nil {
		log.Printf("failed to create bucket client: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}
	defer bucket.Close()

	// Delete the workspace editor items folder.
	key := "editor/" + workspace.Slug + "/"
	err = bucket.DeletePath(c.Context(), key)
	if err != nil {
		log.Printf("Error deleting workspace editor items folder: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// TODO: Delete all related data (repositories, etc.)

	// Return a success message.
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
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
		return utils.WriteResponse(c, fiber.StatusForbidden, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("access_denied")},
		})
	}

	// Parse the request body.
	fields, err := utils.ParseFormFields(c, []string{"new_owner_id"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Get the ID of the new owner.
	newOwnerID, err := utils.DecodeSqids("users", fields["new_owner_id"])
	if err != nil {
		log.Printf("Error decoding SQID: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, err := db.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
	if err != nil {
		log.Printf("Error checking if user is in workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("new_owner_invalid")},
		})
	}
	if !inWorkspace {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("new_owner_invalid")},
		})
	}

	// Update the workspace owner ID.
	updatedWorkspace, err := db.UpdateWorkspace(workspace.ID, map[string]any{
		"owner_id": newOwnerID,
	})
	if err != nil {
		log.Printf("Error updating workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Create the workspace response.
	workspaceResponse, err := formatter.FormatWorkspaceResponse(*updatedWorkspace)
	if err != nil {
		log.Printf("Error formatting workspace response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{"error_occurred"},
		})
	}

	// Return the updated workspace.
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
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
		return utils.WriteResponse(c, fiber.StatusForbidden, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("workspace_cannot_leave_last")},
		})
	}

	// Make sure the user is not the owner of the workspace.
	if workspace.OwnerID == user.ID {
		log.Printf("User is the owner of the workspace")
		return utils.WriteResponse(c, fiber.StatusForbidden, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("workspace_cannot_leave_last")},
		})
	}

	// Leave the workspace.
	err := db.RemoveUserFromWorkspace(user.ID, workspace.ID)
	if err != nil {
		log.Printf("Error leaving workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return a success message.
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Message: dict.T("workspace_left"),
	})
}
