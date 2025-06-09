package controllers

import (
	"errors"
	"fmt"
	"irmin-api/bucket"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"

	"irmin-api/db"

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

func (api *APIControllers) WorkspacesIndex(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)

	if !dictOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the workspaces for the user.
	userWorkspaces, err := api.DB.GetUserWorkspaces(user.ID)
	if err != nil {
		api.Logger.Error("Error retrieving workspaces", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Get a list of workspaces.
	workspaces := make([]db.Workspace, len(userWorkspaces))
	for i, userWorkspace := range userWorkspaces {
		workspaces[i] = userWorkspace.Workspace
	}

	// Format the workspaces.
	workspacesResponse, formatErr := formatter.FormatIndexResponse(
		workspaces,
		formatter.FormatWorkspaceResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		api.Logger.Error("Error formatting workspaces", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the workspaces.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: workspacesResponse,
	})
}

func (api *APIControllers) WorkspacesStore(c fiber.Ctx) error {
	// Get the dictionary and user from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)

	if !dictOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the request body.
	fields, parseFormFieldsErr := utils.ParseFormFields(c, []string{"name"}, []string{"description"})
	if parseFormFieldsErr != nil {
		api.Logger.Error("Error parsing form fields", "error", parseFormFieldsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Create the workspace.
	newWorkspace := db.Workspace{
		Name:        fields["name"],
		Slug:        utils.Slugify(fields["name"]),
		Description: fields["description"],
		OwnerID:     user.ID,
	}
	if createWorkspaceErr := api.DB.Create(&newWorkspace).Error; createWorkspaceErr != nil {
		api.Logger.Error("Error creating workspace", "error", createWorkspaceErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Find the default role for the user
	ownerRole, err := api.DB.GetOwnerRole()
	if err != nil {
		api.Logger.Error("Error getting default role", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Add the user to the workspace.
	_, addUserToWorkspaceErr := api.DB.AddUserToWorkspace(
		user.ID,
		newWorkspace.ID,
		[]uint{ownerRole.ID},
	)
	if addUserToWorkspaceErr != nil {
		api.Logger.Error("Error adding user to workspace", "error", addUserToWorkspaceErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Set the default policies for the workspace.
	if setDefaultPoliciesErr := lib.SetDefaultPolicies(api.DB, newWorkspace.ID, false); setDefaultPoliciesErr != nil {
		api.Logger.Error("Error setting default policies", "error", setDefaultPoliciesErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Create a bucket folder for the editor files of the workspace.
	bucket, createBucketClientErr := bucket.CreateClient(api.Env)
	if createBucketClientErr != nil {
		api.Logger.Error("failed to create bucket client", "error", createBucketClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	defer bucket.Close()
	key := "editor/" + newWorkspace.Slug + "/"
	if writePathErr := bucket.WritePath(c.Context(), key, ""); writePathErr != nil {
		api.Logger.Error("Error creating workspace editor items folder object", "error", writePathErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the response.
	workspaceResponse, formatWorkspaceResponseErr := formatter.FormatWorkspaceResponse(&newWorkspace, api.SQIDManager)
	if formatWorkspaceResponseErr != nil {
		api.Logger.Error("Error formatting workspace response", "error", formatWorkspaceResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{"error_occurred"},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Workspace %s created", newWorkspace.Slug),
		UserID:      &user.ID,
		WorkspaceID: &newWorkspace.ID,
	})

	// Return the new workspace.
	return utils.WriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workspace_created"),
		Data:    workspaceResponse,
	})
}

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
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: workspaceResponse,
	})
}

func (api *APIControllers) WorkspacesUpdate(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the request body - all fields are optional during update
	fields, parseFormFieldsErr := utils.ParseFormFields(c, nil, []string{"name", "description"})
	if parseFormFieldsErr != nil {
		api.Logger.Error("Error parsing form fields", "error", parseFormFieldsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Only update fields that were provided
	if fields["name"] != "" {
		workspace.Name = fields["name"]
		workspace.Slug = utils.Slugify(fields["name"])
	}
	if fields["description"] != "" {
		workspace.Description = fields["description"]
	}
	if updateWorkspaceErr := api.DB.Save(&workspace).Error; updateWorkspaceErr != nil {
		api.Logger.Error("Error updating workspace", "error", updateWorkspaceErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Create the workspace response.
	workspaceResponse, formatWorkspaceResponseErr := formatter.FormatWorkspaceResponse(
		workspace,
		api.SQIDManager,
	)
	if formatWorkspaceResponseErr != nil {
		api.Logger.Error("Error formatting workspace response", "error", formatWorkspaceResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{"error_occurred"},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Workspace %s updated", workspace.Slug),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Return the updated workspace.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workspace_updated"),
		Data:    workspaceResponse,
	})
}

func (api *APIControllers) WorkspacesDestroy(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Check if the workspace owner is deleting the workspace.
	if workspace.OwnerID != user.ID {
		api.Logger.Error("User is not the owner of the workspace")
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "access_denied")},
		})
	}

	// Delete the workspace.
	deleteWorkspaceErr := api.DB.DeleteWorkspace(workspace.ID)
	if deleteWorkspaceErr != nil {
		api.Logger.Error("Error deleting workspace", "error", deleteWorkspaceErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Create bucket client
	bucket, createBucketClientErr := bucket.CreateClient(api.Env)
	if createBucketClientErr != nil {
		api.Logger.Error("failed to create bucket client", "error", createBucketClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}
	defer bucket.Close()

	// Delete the workspace editor items folder.
	key := "editor/" + workspace.Slug + "/"
	deletePathErr := bucket.DeletePath(c.Context(), key)
	if deletePathErr != nil {
		api.Logger.Error("Error deleting workspace editor items folder", "error", deletePathErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// TODO: Delete all related data (repositories, etc.)

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("Workspace %s deleted", workspace.Slug),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Return a success message.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workspace_deleted"),
	})
}

func (api *APIControllers) TransferWorkspaceOwnership(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Check if the workspace owner is deleting the workspace.
	if workspace.OwnerID != user.ID {
		api.Logger.Error("User is not the owner of the workspace")
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "access_denied")},
		})
	}

	// Parse the request body.
	fields, parseFormFieldsErr := utils.ParseFormFields(c, []string{"new_owner_id"}, nil)
	if parseFormFieldsErr != nil {
		api.Logger.Error("Error parsing form fields", "error", parseFormFieldsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Get the ID of the new owner.
	newOwnerID, decodeSqidsErr := api.SQIDManager.Decode("users", fields["new_owner_id"])
	if decodeSqidsErr != nil {
		api.Logger.Error("Error decoding SQID", "error", decodeSqidsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, isUserInWorkspaceErr := api.DB.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
	if isUserInWorkspaceErr != nil {
		api.Logger.Error("Error checking if user is in workspace", "error", isUserInWorkspaceErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "new_owner_invalid")},
		})
	}
	if !inWorkspace {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "new_owner_invalid")},
		})
	}

	// Get the owner role
	ownerRole, err := api.DB.GetOwnerRole()
	if err != nil {
		api.Logger.Error("Error getting owner role", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Update the new owner's role to owner
	_, updateOwnerRoleErr := api.DB.UpdateWorkspaceUserRoles(uint(newOwnerID), workspace.ID, []uint{ownerRole.ID})
	if updateOwnerRoleErr != nil {
		api.Logger.Error("Error updating owner role", "error", updateOwnerRoleErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Update the workspace owner ID.
	workspace.OwnerID = uint(newOwnerID)
	if updateWorkspaceErr := api.DB.Save(&workspace).Error; updateWorkspaceErr != nil {
		api.Logger.Error("Error updating workspace", "error", updateWorkspaceErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Create the workspace response.
	workspaceResponse, formatWorkspaceResponseErr := formatter.FormatWorkspaceResponse(
		workspace,
		api.SQIDManager,
	)
	if formatWorkspaceResponseErr != nil {
		api.Logger.Error("Error formatting workspace response", "error", formatWorkspaceResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{"error_occurred"},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type: db.LogEventTypeUpdate,
		Description: fmt.Sprintf(
			"Workspace %s ownership transferred to %s",
			workspace.Slug,
			workspace.Owner.Email,
		),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Return the updated workspace.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workspace_ownership_transferred"),
		Data:    workspaceResponse,
	})
}

func (api *APIControllers) LeaveWorkspace(c fiber.Ctx) error {
	// Get the dictionary, workspace, and user from the request context.
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !dictOk || !userOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Make sure that the user is not the last user in the workspace.
	if len(workspace.Users) == 1 {
		api.Logger.Error("User is the last user in the workspace")
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "workspace_cannot_leave_last")},
		})
	}

	// Make sure the user is not the owner of the workspace.
	if workspace.OwnerID == user.ID {
		api.Logger.Error("User is the owner of the workspace")
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "workspace_cannot_leave_last")},
		})
	}

	// Leave the workspace.
	removeUserFromWorkspaceErr := api.DB.RemoveUserFromWorkspace(user.ID, workspace.ID)
	if removeUserFromWorkspaceErr != nil {
		api.Logger.Error("Error leaving workspace", "error", removeUserFromWorkspaceErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeInfo,
		Description: fmt.Sprintf("User %s left workspace %s", user.Email, workspace.Slug),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Return a success message.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workspace_left"),
	})
}
