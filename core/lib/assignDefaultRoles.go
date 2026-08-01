package lib

import (
	"errors"
	"irmin-api/db"
)

// findRequiredRoles retrieves the default and owner roles from the database.
func findRequiredRoles(d *db.Database) (*db.Role, *db.Role, error) {
	roles, err := d.GetRoles()
	if err != nil {
		return nil, nil, err
	}

	var defaultRole, ownerRole *db.Role
	for i := range roles {
		if roles[i].IsDefault {
			defaultRole = &roles[i]
		}
		if roles[i].IsOwner {
			ownerRole = &roles[i]
		}
		if defaultRole != nil && ownerRole != nil {
			break
		}
	}

	if defaultRole == nil || ownerRole == nil {
		return nil, nil, errors.New("required roles not found in database")
	}

	return defaultRole, ownerRole, nil
}

// assignRoleToUser assigns the appropriate role to a workspace user.
func assignRoleToUser(d *db.Database, workspaceUser db.WorkspaceUser, defaultRole, ownerRole *db.Role) error {
	// Determine which role to assign to the user
	roleToAssign := defaultRole
	if workspaceUser.Workspace.OwnerID == workspaceUser.UserID {
		roleToAssign = ownerRole
	}

	// Check if the user already has this role
	for _, role := range workspaceUser.Roles {
		if role.RoleID == roleToAssign.ID {
			return nil
		}
	}

	// Create the workspace user role
	workspaceUserRole := db.WorkspaceUserRole{
		WorkspaceUserID: workspaceUser.ID,
		RoleID:          roleToAssign.ID,
	}
	return d.Create(&workspaceUserRole).Error
}

// AssignDefaultRolesToUsersWithoutRoles assigns the default role to any users in workspaces who don't have any roles.
// For workspace owners, it assigns the owner role instead of the default role.
func AssignDefaultRolesToUsersWithoutRoles(d *db.Database) error {
	var workspaceUsers []db.WorkspaceUser
	if err := d.Preload("Roles").Preload("Workspace").Find(&workspaceUsers).Error; err != nil {
		return err
	}

	defaultRole, ownerRole, err := findRequiredRoles(d)
	if err != nil {
		return err
	}

	for _, workspaceUser := range workspaceUsers {
		if assignErr := assignRoleToUser(d, workspaceUser, defaultRole, ownerRole); assignErr != nil {
			return assignErr
		}
	}

	return nil
}
