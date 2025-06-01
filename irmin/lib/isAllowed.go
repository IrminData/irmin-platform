package lib

import (
	"irmin-api/db"
)

// IsAllowed checks if a user is allowed to perform an action on a resource
// It checks for explicit deny policies first, then for allow policies, and returns false if no policies match
// It returns true if any allow policy matches, false if any deny policy matches, or an error if there's a database error
// Workspace owners are always allowed to perform any action on any resource (ownership defined based on workspace.OwnerID or role.IsOwner).
func IsAllowed(
	d *db.Database,
	user *db.User,
	workspace *db.Workspace,
	resource db.PolicyResource,
	resourceID *uint,
	action db.PolicyAction,
) (bool, error) {
	// Check if the user is the workspace owner
	if workspace.OwnerID == user.ID {
		return true, nil
	}

	// Get the workspace user
	workspaceUser, err := d.GetWorkspaceUser(workspace.ID, user.ID)
	if err != nil {
		return false, err
	}

	// Build a list of role IDs associated with the workspace user.
	roleIDs := []uint{}
	for _, role := range workspaceUser.Roles {
		roleIDs = append(roleIDs, role.RoleID)
	}

	// Check if any of the user's roles have IsOwner=true
	var ownerRoleCount int64
	if ownerRoleCountErr := d.Model(&db.Role{}).Where("id IN ? AND is_owner = ?", roleIDs, true).Count(&ownerRoleCount).Error; ownerRoleCountErr != nil {
		return false, ownerRoleCountErr
	}
	if ownerRoleCount > 0 {
		return true, nil
	}

	// Check policies in order of precedence:
	// 1. User-specific policies (most specific)
	// 2. Role-specific policies
	// 3. Everyone policies (least specific)

	// First check for explicit deny policies in order of precedence
	var denyCount int64

	// Check user-specific deny policies
	d.Model(&db.Policy{}).Where(`
		workspace_id = ? AND
		resource = ? AND
		(resource_id = ? OR resource_id = 0) AND
		action = ? AND
		effect = ? AND
		principal = ? AND
		workspace_user_id = ?
	`, workspace.ID, resource, resourceID, action, db.PolicyEffectDeny,
		db.PolicyPrincipalWorkspaceUser, workspaceUser.ID).Count(&denyCount)
	if denyCount > 0 {
		return false, nil
	}

	// Check role-specific deny policies
	d.Model(&db.Policy{}).Where(`
		workspace_id = ? AND
		resource = ? AND
		(resource_id = ? OR resource_id = 0) AND
		action = ? AND
		effect = ? AND
		principal = ? AND
		role_id IN ?
	`, workspace.ID, resource, resourceID, action, db.PolicyEffectDeny,
		db.PolicyPrincipalRole, roleIDs).Count(&denyCount)
	if denyCount > 0 {
		return false, nil
	}

	// Check everyone deny policies
	d.Model(&db.Policy{}).Where(`
		workspace_id = ? AND
		resource = ? AND
		(resource_id = ? OR resource_id = 0) AND
		action = ? AND
		effect = ? AND
		principal = ?
	`, workspace.ID, resource, resourceID, action, db.PolicyEffectDeny,
		db.PolicyPrincipalEveryone).Count(&denyCount)
	if denyCount > 0 {
		return false, nil
	}

	// Then check for allow policies in order of precedence
	var allowCount int64

	// Check user-specific allow policies
	d.Model(&db.Policy{}).Where(`
		workspace_id = ? AND
		resource = ? AND
		(resource_id = ? OR resource_id = 0) AND
		action = ? AND
		effect = ? AND
		principal = ? AND
		workspace_user_id = ?
	`, workspace.ID, resource, resourceID, action, db.PolicyEffectAllow,
		db.PolicyPrincipalWorkspaceUser, workspaceUser.ID).Count(&allowCount)
	if allowCount > 0 {
		return true, nil
	}

	// Check role-specific allow policies
	d.Model(&db.Policy{}).Where(`
		workspace_id = ? AND
		resource = ? AND
		(resource_id = ? OR resource_id = 0) AND
		action = ? AND
		effect = ? AND
		principal = ? AND
		role_id IN ?
	`, workspace.ID, resource, resourceID, action, db.PolicyEffectAllow,
		db.PolicyPrincipalRole, roleIDs).Count(&allowCount)
	if allowCount > 0 {
		return true, nil
	}

	// Check everyone allow policies
	d.Model(&db.Policy{}).Where(`
		workspace_id = ? AND
		resource = ? AND
		(resource_id = ? OR resource_id = 0) AND
		action = ? AND
		effect = ? AND
		principal = ?
	`, workspace.ID, resource, resourceID, action, db.PolicyEffectAllow,
		db.PolicyPrincipalEveryone).Count(&allowCount)
	if allowCount > 0 {
		return true, nil
	}

	// Nothing matched → deny by default
	return false, nil
}
