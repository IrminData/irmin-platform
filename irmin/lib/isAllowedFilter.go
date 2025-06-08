package lib

import (
	"fmt"
	"irmin-api/db"
)

// IsAllowedFilter filters a list of resources based on user permissions.
// It returns only the resources that the user has access to for the given action.
// The function is optimized to minimize database queries by batching permission checks.
// The idExtractor function should return the ID of the resource.
func IsAllowedFilter[T any](
	ps *PermissionService,
	user *db.User,
	workspace *db.Workspace,
	resource db.PolicyResource,
	action db.PolicyAction,
	resources []T,
	idExtractor func(T) uint,
) ([]T, error) {
	if len(resources) == 0 {
		return resources, nil
	}

	// If user is workspace owner, they have access to all resources
	if workspace.OwnerID == user.ID {
		return resources, nil
	}

	// Get the workspace user and their roles
	workspaceUser, err := ps.db.GetWorkspaceUser(workspace.ID, user.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace user: %w", err)
	}

	// Build a list of role IDs associated with the workspace user
	roleIDs := make([]uint, 0, len(workspaceUser.Roles))
	for _, role := range workspaceUser.Roles {
		roleIDs = append(roleIDs, role.RoleID)
	}

	// Check if any of the user's roles have IsOwner=true
	if len(roleIDs) > 0 {
		var ownerRoleCount int64
		if ownerRoleCountErr := ps.db.Model(&db.Role{}).Where("id IN ? AND is_owner = ?", roleIDs, true).Count(&ownerRoleCount).Error; ownerRoleCountErr != nil {
			return nil, fmt.Errorf("failed to check owner roles: %w", ownerRoleCountErr)
		}
		if ownerRoleCount > 0 {
			return resources, nil
		}
	}

	// Get all resource IDs
	resourceIDs := make([]uint, len(resources))
	for i, resource := range resources {
		resourceIDs[i] = idExtractor(resource)
	}

	// Get all policies that might apply to these resources
	var policies []PolicyMatch
	query := ps.db.Model(&db.Policy{}).
		Select("effect, principal, workspace_user_id, role_id, resource_id").
		Where("workspace_id = ? AND resource = ? AND action = ?", workspace.ID, resource, action).
		Where("(resource_id IN ? OR resource_id = 0 OR resource_id IS NULL)", resourceIDs)

	// Add conditions for different principals
	var conditions []string
	var values []any

	// User-specific policies
	conditions = append(conditions, "(principal = ? AND workspace_user_id = ?)")
	values = append(values, db.PolicyPrincipalWorkspaceUser, workspaceUser.ID)

	// Role-specific policies (only if user has roles)
	if len(roleIDs) > 0 {
		conditions = append(conditions, "(principal = ? AND role_id IN ?)")
		values = append(values, db.PolicyPrincipalRole, roleIDs)
	}

	// Everyone policies
	conditions = append(conditions, "principal = ?")
	values = append(values, db.PolicyPrincipalEveryone)

	// Combine all conditions with OR
	whereClause := fmt.Sprintf("(%s)", conditions[0])
	for i := 1; i < len(conditions); i++ {
		whereClause += fmt.Sprintf(" OR (%s)", conditions[i])
	}

	query = query.Where(whereClause, values...)

	// Execute the query
	if findPoliciesErr := query.Find(&policies).Error; findPoliciesErr != nil {
		return nil, fmt.Errorf("failed to query policies: %w", findPoliciesErr)
	}

	// Create a map of resource IDs to their allowed status
	allowedResources := make(map[uint]bool)
	for _, res := range resources {
		resourceID := idExtractor(res)
		allowed, isAllowedErr := ps.IsAllowed(user, workspace, resource, &resourceID, action)
		if isAllowedErr != nil {
			return nil, fmt.Errorf("failed to check permission for resource %d: %w", resourceID, isAllowedErr)
		}
		allowedResources[resourceID] = allowed
	}

	// Filter the resources based on the allowed status
	var filteredResources []T
	for _, res := range resources {
		if allowedResources[idExtractor(res)] {
			filteredResources = append(filteredResources, res)
		}
	}

	return filteredResources, nil
}
