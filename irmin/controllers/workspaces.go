package controllers

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/bucket"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"strings"

	"irmin-api/db"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
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
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: workspacesResponse,
	})
}

// createWorkspaceInTransaction handles the transactional creation of workspaces with all related setup.
func (api *APIControllers) createWorkspaceInTransaction(
	ctx context.Context,
	req irmincore.CreateWorkspaceRequest,
	user *db.User,
) (*db.Workspace, error) {
	var newWorkspace *db.Workspace

	// Create a bucket client
	bucket, createBucketClientErr := bucket.CreateClient(api.Env)
	if createBucketClientErr != nil {
		api.Logger.ErrorContext(ctx, "failed to create bucket client", "error", createBucketClientErr)
		return nil, createBucketClientErr
	}
	defer bucket.Close()

	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Create the workspace
		newWorkspace = &db.Workspace{
			Name:        req.Name,
			Slug:        utils.Slugify(req.Name),
			Description: req.Description,
			OwnerID:     user.ID,
			Owner:       *user,
		}
		if createWorkspaceErr := tx.Create(&newWorkspace).Error; createWorkspaceErr != nil {
			api.Logger.ErrorContext(ctx, "Error creating workspace", "error", createWorkspaceErr)
			return createWorkspaceErr
		}

		// Get owner role for the workspace
		ownerRole, err := api.DB.GetOwnerRole()
		if err != nil {
			api.Logger.ErrorContext(ctx, "Error getting owner role", "error", err)
			return err
		}

		// Add user to workspace with default role
		_, addUserToWorkspaceErr := api.DB.AddUserToWorkspace(tx, user.ID, newWorkspace.ID, []uint{ownerRole.ID})
		if addUserToWorkspaceErr != nil {
			api.Logger.ErrorContext(ctx, "Error adding user to workspace", "error", addUserToWorkspaceErr)
			return addUserToWorkspaceErr
		}

		// Set default policies for the workspace
		setDefaultPoliciesErr := lib.SetDefaultPolicies(tx, newWorkspace.ID, false)
		if setDefaultPoliciesErr != nil {
			api.Logger.ErrorContext(ctx, "Error setting default policies", "error", setDefaultPoliciesErr)
			return setDefaultPoliciesErr
		}

		// Seed default tags for the workspace
		seedDefaultTagsErr := lib.SeedDefaultTags(tx, newWorkspace.ID)
		if seedDefaultTagsErr != nil {
			api.Logger.ErrorContext(ctx, "Error seeding default tags", "error", seedDefaultTagsErr)
			return seedDefaultTagsErr
		}

		// Create a bucket folder for the editor files of the workspace
		// This is done after the database operations, so that the operations would be atomic
		editorPathPrefix := utils.ConstructEditorStorageNamespace(api.Env.IrminS3Bucket, newWorkspace.Slug)
		editorPathPrefix = strings.TrimPrefix(editorPathPrefix, "s3://")
		if !strings.HasSuffix(editorPathPrefix, "/") {
			editorPathPrefix += "/"
		}
		if writePathErr := bucket.WritePath(ctx, editorPathPrefix, ""); writePathErr != nil {
			api.Logger.ErrorContext(ctx, "Error creating workspace editor items folder object", "error", writePathErr)
			return writePathErr
		}

		return nil
	})

	if transactionErr != nil {
		return nil, transactionErr
	}

	return newWorkspace, nil
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

	// Use database transaction to ensure atomicity
	newWorkspace, transactionErr := api.createWorkspaceInTransaction(c, req, user)
	if transactionErr != nil {
		api.Logger.Error("Transaction failed for workspace creation", "error", transactionErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the response.
	workspaceResponse, formatWorkspaceResponseErr := formatter.FormatWorkspaceResponse(newWorkspace, api.SQIDManager)
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

	// Only update fields that were provided
	if req.Name != "" {
		workspace.Name = req.Name
		// Slug is not updated, as it is used as a unique identifier for the workspace
	}
	if req.Description != "" {
		workspace.Description = req.Description
	}

	// Update the workspace in the database
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
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workspace_updated"),
		Data:    workspaceResponse,
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

	// Format the workspace's base path prefix
	editorPathPrefix := utils.ConstructEditorStorageNamespace(api.Env.IrminS3Bucket, workspace.Slug)
	editorPathPrefix = strings.TrimPrefix(editorPathPrefix, "s3://")
	if !strings.HasSuffix(editorPathPrefix, "/") {
		editorPathPrefix += "/"
	}

	// Delete the workspace editor items folder.
	deletePathErr := bucket.DeletePath(c, editorPathPrefix)
	if deletePathErr != nil {
		api.Logger.Error("Error deleting workspace editor items folder", "error", deletePathErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// TODO: Delete all related data (repositories, workflows, connections, etc.) when workspace is deleted
	// This should include:
	// - All repositories owned by the workspace
	// - All workflows within the workspace
	// - All connections within the workspace
	// - Any cached data or temporary files
	// - Audit logs related to the workspace (consider retention policy)
	// Note: This needs to be done in a transaction to ensure consistency

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("Workspace %s deleted", workspace.Slug),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

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

	// Parse and validate the JSON request body
	var req irmincore.TransferOwnershipRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Validate and decode the new owner SQID
	newOwnerID, err := api.SQIDManager.Decode("users", req.NewOwnerID)
	if err != nil {
		api.Logger.Error("Error decoding SQID", "sqid", req.NewOwnerID, "type", "users", "error", err)
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

	// Use database transaction to ensure atomicity
	transactionErr := api.DB.Transaction(func(tx *gorm.DB) error {
		// Update the new owner's role to owner
		_, updateOwnerRoleErr := api.DB.UpdateWorkspaceUserRoles(
			tx,
			uint(newOwnerID),
			workspace.ID,
			[]uint{ownerRole.ID},
		)
		if updateOwnerRoleErr != nil {
			api.Logger.Error("Error updating owner role", "error", updateOwnerRoleErr)
			return updateOwnerRoleErr
		}

		// Update the workspace owner ID.
		workspace.OwnerID = uint(newOwnerID)
		if updateWorkspaceErr := tx.Save(&workspace).Error; updateWorkspaceErr != nil {
			api.Logger.Error("Error updating workspace", "error", updateWorkspaceErr)
			return updateWorkspaceErr
		}

		return nil
	})

	if transactionErr != nil {
		api.Logger.Error("Transaction failed for workspace ownership transfer", "error", transactionErr)
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
	leaveWorkspaceErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return api.DB.RemoveUserFromWorkspace(
			tx,
			user.ID,
			workspace.ID,
		)
	})
	if leaveWorkspaceErr != nil {
		api.Logger.Error("Error leaving workspace", "error", leaveWorkspaceErr)
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
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "workspace_left"),
	})
}
