package services

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/bucket"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/utils"
	"strings"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	"gorm.io/gorm"
)

func (api *APIServices) GetWorkspace(ctx context.Context, user *db.User, workspaceSlug string) (*db.Workspace, error) {
	// Get the workspace by its slug.
	workspace, err := api.DB.GetWorkspaceBySlug(workspaceSlug)
	if err != nil {
		api.Logger.ErrorContext(ctx, "Error retrieving workspace", "error", err)
		return nil, err
	}

	// Check if the user is a member of the workspace.
	isMember, err := api.DB.IsUserInWorkspace(user.ID, workspace.ID)
	if err != nil {
		api.Logger.ErrorContext(ctx, "Error checking user membership", "error", err)
		return nil, err
	}
	if !isMember {
		api.Logger.ErrorContext(ctx, "User not a member of the workspace")
		return nil, ErrWorkspaceNotMember
	}

	return workspace, nil
}

func (api *APIServices) ListWorkspaces(user *db.User) ([]db.Workspace, error) {
	// Get the workspaces for the user.
	userWorkspaces, err := api.DB.GetUserWorkspaces(user.ID)
	if err != nil {
		api.Logger.ErrorContext(
			context.Background(),
			"Error fetching user workspaces",
			"error",
			err,
			"user_id",
			user.ID,
		)
		return nil, err
	}

	// Get a list of workspaces.
	workspaces := make([]db.Workspace, len(userWorkspaces))
	for i, userWorkspace := range userWorkspaces {
		workspaces[i] = userWorkspace.Workspace
	}

	return workspaces, nil
}

func (api *APIServices) CreateWorkspace(
	ctx context.Context,
	user *db.User,
	req irmincore.CreateWorkspaceRequest,
) (*db.Workspace, error) {
	var newWorkspace *db.Workspace

	// Create a bucket client
	bucket, createBucketClientErr := bucket.CreateClient(api.Env, api.Env.IrminS3Bucket)
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
		editorPathPrefix := utils.ConstructEditorStorageNamespace(newWorkspace.Slug)
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

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Workspace %s created", newWorkspace.Slug),
		UserID:      &user.ID,
		WorkspaceID: &newWorkspace.ID,
	})

	return newWorkspace, nil
}

func (api *APIServices) UpdateWorkspace(
	user *db.User,
	workspace *db.Workspace,
	req irmincore.UpdateWorkspaceRequest,
) (*db.Workspace, error) {
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
		api.Logger.ErrorContext(
			context.Background(),
			"Error updating workspace in database",
			"error",
			updateWorkspaceErr,
			"workspace_id",
			workspace.ID,
		)
		return nil, updateWorkspaceErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Workspace %s updated", workspace.Slug),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	return workspace, nil
}

func (api *APIServices) DeleteWorkspace(ctx context.Context, user *db.User, workspace *db.Workspace) error {
	// Check if the workspace owner is deleting the workspace.
	if workspace.OwnerID != user.ID {
		api.Logger.ErrorContext(ctx, "User is not the owner of the workspace")
		return ErrWorkspaceNotOwner
	}

	// Delete the workspace.
	deleteWorkspaceErr := api.DB.DeleteWorkspace(workspace.ID)
	if deleteWorkspaceErr != nil {
		api.Logger.ErrorContext(ctx, "Error deleting workspace", "error", deleteWorkspaceErr)
		return deleteWorkspaceErr
	}

	// Create bucket client
	bucket, createBucketClientErr := bucket.CreateClient(api.Env, api.Env.IrminS3Bucket)
	if createBucketClientErr != nil {
		api.Logger.ErrorContext(ctx, "failed to create bucket client", "error", createBucketClientErr)
		return createBucketClientErr
	}
	defer bucket.Close()

	// Format the workspace's base path prefix
	editorPathPrefix := utils.ConstructEditorStorageNamespace(workspace.Slug)
	editorPathPrefix = strings.TrimPrefix(editorPathPrefix, "s3://")
	if !strings.HasSuffix(editorPathPrefix, "/") {
		editorPathPrefix += "/"
	}

	// Delete the workspace editor items folder.
	deletePathErr := bucket.DeletePath(ctx, editorPathPrefix)
	if deletePathErr != nil {
		api.Logger.ErrorContext(ctx, "Error deleting workspace editor items folder", "error", deletePathErr)
		return deletePathErr
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

	return nil
}

func (api *APIServices) TransferWorkspaceOwnership(
	ctx context.Context,
	user *db.User,
	workspace *db.Workspace,
	req irmincore.TransferOwnershipRequest,
) (*db.Workspace, error) {
	// Check if the workspace owner is deleting the workspace.
	if workspace.OwnerID != user.ID {
		api.Logger.ErrorContext(ctx, "User is not the owner of the workspace")
		return nil, ErrWorkspaceNotOwner
	}

	// Parse and validate the JSON request body
	if validationErr := api.Validator.ValidateEnhanced(&req); validationErr.HasErrors() {
		return nil, validationErr
	}

	// Validate and decode the new owner SQID
	newOwnerID, err := api.SQIDManager.Decode("users", req.NewOwnerID)
	if err != nil {
		api.Logger.ErrorContext(ctx, "Error decoding new owner SQID", "error", err, "new_owner_sqid", req.NewOwnerID)
		return nil, err
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, isUserInWorkspaceErr := api.DB.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
	if isUserInWorkspaceErr != nil {
		api.Logger.ErrorContext(ctx, "Error checking if user is in workspace", "error", isUserInWorkspaceErr)
		return nil, isUserInWorkspaceErr
	}
	if !inWorkspace {
		return nil, errors.New("new owner is not a member of the workspace")
	}

	// Get the owner role
	ownerRole, err := api.DB.GetOwnerRole()
	if err != nil {
		api.Logger.ErrorContext(ctx, "Error getting owner role", "error", err)
		return nil, err
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
			api.Logger.ErrorContext(ctx, "Error updating owner role", "error", updateOwnerRoleErr)
			return updateOwnerRoleErr
		}

		// Update the workspace owner ID.
		workspace.OwnerID = uint(newOwnerID)
		if updateWorkspaceErr := tx.Save(&workspace).Error; updateWorkspaceErr != nil {
			api.Logger.ErrorContext(ctx, "Error updating workspace", "error", updateWorkspaceErr)
			return updateWorkspaceErr
		}

		return nil
	})

	if transactionErr != nil {
		api.Logger.ErrorContext(ctx, "Transaction failed for workspace ownership transfer", "error", transactionErr)
		return nil, transactionErr
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

	return workspace, nil
}

func (api *APIServices) LeaveWorkspace(user *db.User, workspace *db.Workspace) error {
	// Make sure that the user is not the last user in the workspace.
	if len(workspace.Users) == 1 {
		return ErrWorkspaceLastMemberCannotLeave
	}

	// Make sure the user is not the owner of the workspace.
	if workspace.OwnerID == user.ID {
		return ErrWorkspaceOwnerCannotLeave
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
		api.Logger.ErrorContext(
			context.Background(),
			"Error removing user from workspace during leave operation",
			"error",
			leaveWorkspaceErr,
			"user_id",
			user.ID,
			"workspace_id",
			workspace.ID,
		)
		return leaveWorkspaceErr
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeInfo,
		Description: fmt.Sprintf("User %s left workspace %s", user.Email, workspace.Slug),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	return nil
}
