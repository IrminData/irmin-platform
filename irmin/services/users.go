package services

import (
	"context"
	"fmt"
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/permissions"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	"gorm.io/gorm"
)

func (api *APIServices) GetWorkspaceUser(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
	workspaceUserSqid string,
) (*db.WorkspaceUser, error) {
	// Decode the user ID.
	userID, err := api.SQIDManager.Decode("users", workspaceUserSqid)
	if err != nil {
		api.Logger.ErrorContext(c, "Error decoding user sqid", "error", err)
		return nil, NewInternalErrorf("error decoding user SQID: %w", err)
	}

	// Make sure this is allowed
	resourceID := uint(userID)
	isAllowed, err := api.PermissionService.IsAllowed(
		user,
		workspace,
		db.PolicyResourceUser,
		&resourceID,
		db.PolicyActionRead,
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error checking if user is allowed", "error", err)
		return nil, err
	}
	if !isAllowed {
		return nil, ErrAccessDenied
	}

	// Find the workspace user by their ID and the workspace ID.
	workspaceMember, err := api.DB.GetWorkspaceUser(workspace.ID, uint(userID))
	if err != nil {
		api.Logger.ErrorContext(c, "Error retrieving user", "error", err)
		return nil, NewInternalErrorf("error retrieving user: %w", err)
	}

	return workspaceMember, nil
}

func (api *APIServices) ListWorkspaceUsers(
	c context.Context,
	user *db.User,
	workspace *db.Workspace,
) ([]db.WorkspaceUser, error) {
	// Get all users in the workspace
	workspaceUsers, getUsersErr := api.DB.GetUsersInWorkspace(workspace.ID)
	if getUsersErr != nil {
		api.Logger.ErrorContext(c, "Error fetching users", "error", getUsersErr)
		return nil, NewInternalErrorf("error fetching users: %w", getUsersErr)
	}

	// Filter users based on user permissions
	filteredUsers, err := permissions.IsAllowedFilter(
		api.PermissionService,
		user,
		workspace,
		db.PolicyResourceUser,
		db.PolicyActionRead,
		workspaceUsers,
		func(u db.WorkspaceUser) uint { return u.UserID },
	)
	if err != nil {
		api.Logger.ErrorContext(c, "Error filtering users by permissions", "error", err)
		return nil, NewInternalErrorf("error filtering users by permissions: %w", err)
	}

	return filteredUsers, nil
}

func (api *APIServices) RemoveUserFromWorkspace(
	c context.Context,
	currentUser *db.User,
	workspace *db.Workspace,
	workspaceMember *db.WorkspaceUser,
) error {
	// Make sure the deleted user is not the user making the request
	if currentUser.ID == workspaceMember.UserID {
		return ErrCannotRemoveSelfFromWorkspace
	}

	// Make sure the deleted user is not the workspace owner
	if workspace.OwnerID == workspaceMember.UserID {
		return ErrCannotRemoveOwnerFromWorkspace
	}

	// Remove the user from the workspace
	txErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return api.DB.RemoveUserFromWorkspace(tx, workspaceMember.UserID, workspace.ID)
	})
	if txErr != nil {
		api.Logger.ErrorContext(c, "Error removing user from workspace", "error", txErr)
		return NewInternalErrorf("error in database transaction: %w", txErr)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("User %s removed from workspace", workspaceMember.User.Email),
		UserID:      &currentUser.ID,
		WorkspaceID: &workspace.ID,
	})

	return nil
}

func (api *APIServices) UpdateWorkspaceUserRoles(
	c context.Context,
	currentUser *db.User,
	workspace *db.Workspace,
	workspaceMember *db.WorkspaceUser,
	req irmincore.UpdateUserRolesRequest,
) (*db.WorkspaceUser, error) {
	// Parse and validate roles
	newRoles := api.parseAndValidateRoles(c, req.Roles)

	// TODO: We should check if those are even real roles

	// Update user roles
	var updatedWorkspaceMember *db.WorkspaceUser
	txErr := api.DB.Transaction(func(tx *gorm.DB) error {
		var updateRolesErr error
		updatedWorkspaceMember, updateRolesErr = api.DB.UpdateWorkspaceUserRoles(
			tx,
			workspaceMember.UserID,
			workspace.ID,
			newRoles,
		)
		return updateRolesErr
	})
	if txErr != nil {
		api.Logger.ErrorContext(c, "Error updating workspace user roles", "error", txErr)
		return nil, NewInternalErrorf("error in database transaction: %w", txErr)
	}

	// Refetch updated user
	updatedWorkspaceMember, err := api.DB.GetWorkspaceUser(workspace.ID, workspaceMember.UserID)
	if err != nil {
		api.Logger.ErrorContext(c, "Error fetching workspace user", "error", err)
		return nil, NewInternalErrorf("error fetching workspace user: %w", err)
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type: db.LogEventTypeUpdate,
		Description: fmt.Sprintf(
			"User %s roles updated",
			updatedWorkspaceMember.User.Email,
		),
		UserID:      &currentUser.ID,
		WorkspaceID: &workspace.ID,
	})

	return updatedWorkspaceMember, nil
}

// parseAndValidateRoles converts string roles to UserWorkspaceRole slice.
func (api *APIServices) parseAndValidateRoles(c context.Context, requestedRoles []string) []uint {
	var newRoles []uint

	for _, role := range requestedRoles {
		roleID, err := api.SQIDManager.Decode("roles", role)
		if err != nil {
			api.Logger.ErrorContext(c, "Error decoding role", "error", err)
		} else {
			newRoles = append(newRoles, uint(roleID))
		}
	}

	return newRoles
}
