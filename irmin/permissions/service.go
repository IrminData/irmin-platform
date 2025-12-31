package permissions

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"irmin-api/db"
	"log/slog"
	"strconv"
	"strings"
	"time"
)

// Service provides permission checking with caching.
type Service struct {
	cache  *Cache
	db     *db.Database
	logger *slog.Logger
}

// NewService creates a new permission service.
func NewService(database *db.Database, logger *slog.Logger) *Service {
	return &Service{
		cache:  NewCache(),
		db:     database,
		logger: logger,
	}
}

// generateCacheKey creates a unique cache key for permission checks.
func generateCacheKey(
	userID, workspaceID uint,
	resource db.PolicyResource,
	resourceID *uint,
	action db.PolicyAction,
) string {
	var resourceIDStr string
	if resourceID != nil {
		resourceIDStr = strconv.FormatUint(uint64(*resourceID), 10)
	} else {
		resourceIDStr = "nil"
	}

	data := fmt.Sprintf("%d:%d:%s:%s:%s", userID, workspaceID, resource, resourceIDStr, action)
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

// PolicyMatch represents a matched policy from the database.
type PolicyMatch struct {
	Effect          db.PolicyEffect
	Principal       db.PolicyPrincipal
	WorkspaceUserID *uint
	RoleID          *uint
	ResourceID      *uint
}

// IsAllowed checks if a user is allowed to perform an action on a resource
// It checks for explicit deny policies first, then for allow policies, and returns false if no policies match
// It returns true if any allow policy matches, false if any deny policy matches, or an error if there's a database error
// Workspace owners are always allowed to perform any action on any resource (ownership defined based on workspace.OwnerID or role.IsOwner).
func (ps *Service) IsAllowed(
	user *db.User,
	workspace *db.Workspace,
	resource db.PolicyResource,
	resourceID *uint,
	action db.PolicyAction,
) (bool, error) {
	// Check cache first
	cacheKey := generateCacheKey(user.ID, workspace.ID, resource, resourceID, action)
	if allowed, found := ps.cache.Get(cacheKey); found {
		return allowed, nil
	}

	// Check if the user is the workspace owner
	if workspace.OwnerID == user.ID {
		ps.cache.Set(cacheKey, true, OwnerPermissionCacheTTL)
		return true, nil
	}

	// Get the workspace user
	workspaceUser, err := ps.db.GetWorkspaceUser(workspace.ID, user.ID)
	if err != nil {
		return false, fmt.Errorf("failed to get workspace user: %w", err)
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
			return false, fmt.Errorf("failed to check owner roles: %w", ownerRoleCountErr)
		}
		if ownerRoleCount > 0 {
			ps.cache.Set(cacheKey, true, OwnerPermissionCacheTTL)
			return true, nil
		}
	}

	// Use optimized single query to check all policies
	allowed, err := checkPoliciesOptimized(ps.db, workspace.ID, workspaceUser.ID, roleIDs, resource, resourceID, action)
	if err != nil {
		return false, err
	}

	// Cache the result
	ps.cache.Set(cacheKey, allowed, DefaultPermissionCacheTTL)

	return allowed, nil
}

// checkPoliciesOptimized uses a single optimized query to check all relevant policies.
func checkPoliciesOptimized(
	d *db.Database,
	workspaceID uint,
	workspaceUserID uint,
	roleIDs []uint,
	resource db.PolicyResource,
	resourceID *uint,
	action db.PolicyAction,
) (bool, error) {
	var policies []PolicyMatch

	// Build the base query conditions
	query := d.Model(&db.Policy{}).
		Select("effect, principal, workspace_user_id, role_id, resource_id").
		Where("workspace_id = ? AND resource = ? AND action = ?", workspaceID, resource, action)

	// Handle resourceID properly - check for both specific resource and wildcard (resourceID = 0)
	if resourceID != nil {
		query = query.Where("(resource_id = ? OR resource_id = 0 OR resource_id IS NULL)", *resourceID)
	} else {
		query = query.Where("(resource_id = 0 OR resource_id IS NULL)")
	}

	// Add conditions for different principals
	var conditions []string
	var values []any

	// User-specific policies
	conditions = append(conditions, "(principal = ? AND workspace_user_id = ?)")
	values = append(values, db.PolicyPrincipalWorkspaceUser, workspaceUserID)

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
	var whereClauseSb160 strings.Builder
	for i := 1; i < len(conditions); i++ {
		whereClauseSb160.WriteString(fmt.Sprintf(" OR (%s)", conditions[i]))
	}
	whereClause += whereClauseSb160.String()

	query = query.Where(whereClause, values...)

	// Execute the query
	if err := query.Find(&policies).Error; err != nil {
		return false, fmt.Errorf("failed to query policies: %w", err)
	}

	// Process results according to precedence rules
	return evaluatePolicies(policies, workspaceUserID, roleIDs, resourceID), nil
}

// evaluatePolicies processes the matched policies according to resource specificity precedence rules.
// Resource specificity takes precedence over principal type:
// 1. Specific resource ID policies (matching the requested resource ID)
// 2. Generic policies (resource_id = NULL or 0)
// Within each category, specific allow policies take precedence over generic deny policies.
func evaluatePolicies(policies []PolicyMatch, workspaceUserID uint, roleIDs []uint, requestedResourceID *uint) bool {
	roleIDMap := make(map[uint]bool, len(roleIDs))
	for _, id := range roleIDs {
		roleIDMap[id] = true
	}

	// Separate policies into specific and generic based on resource ID
	var specificPolicies []PolicyMatch
	var genericPolicies []PolicyMatch

	for _, policy := range policies {
		// Check if policy applies to the user (by principal type)
		if !policyAppliesForUser(policy, workspaceUserID, roleIDMap) {
			continue
		}

		// Categorize by resource specificity
		if isSpecificResourcePolicy(policy, requestedResourceID) {
			specificPolicies = append(specificPolicies, policy)
		} else if isGenericResourcePolicy(policy) {
			genericPolicies = append(genericPolicies, policy)
		}
	}

	// Check specific resource policies first (highest precedence)
	if hasAllowPolicy(specificPolicies) {
		return true // Specific allow takes precedence over everything
	}
	if hasDenyPolicy(specificPolicies) {
		return false // Specific deny takes precedence over generic policies
	}

	// Fall back to generic policies
	if hasDenyPolicy(genericPolicies) {
		return false // Generic deny
	}
	if hasAllowPolicy(genericPolicies) {
		return true // Generic allow
	}

	// Default deny if no policies match
	return false
}

// policyAppliesForUser checks if a policy applies to the current user based on principal type.
func policyAppliesForUser(policy PolicyMatch, workspaceUserID uint, roleIDMap map[uint]bool) bool {
	switch policy.Principal {
	case db.PolicyPrincipalWorkspaceUser:
		return policy.WorkspaceUserID != nil && *policy.WorkspaceUserID == workspaceUserID
	case db.PolicyPrincipalRole:
		return policy.RoleID != nil && roleIDMap[*policy.RoleID]
	case db.PolicyPrincipalEveryone:
		return true
	default:
		return false
	}
}

// isSpecificResourcePolicy checks if a policy is specific to the requested resource ID.
func isSpecificResourcePolicy(policy PolicyMatch, requestedResourceID *uint) bool {
	if policy.ResourceID == nil {
		return false
	}
	if requestedResourceID == nil {
		return false
	}
	return *policy.ResourceID == *requestedResourceID
}

// isGenericResourcePolicy checks if a policy is generic (applies to all resources of this type).
func isGenericResourcePolicy(policy PolicyMatch) bool {
	return policy.ResourceID == nil || *policy.ResourceID == 0
}

// hasAllowPolicy checks if there are any allow policies in the list.
func hasAllowPolicy(policies []PolicyMatch) bool {
	for _, policy := range policies {
		if policy.Effect == db.PolicyEffectAllow {
			return true
		}
	}
	return false
}

// hasDenyPolicy checks if there are any deny policies in the list.
func hasDenyPolicy(policies []PolicyMatch) bool {
	for _, policy := range policies {
		if policy.Effect == db.PolicyEffectDeny {
			return true
		}
	}
	return false
}

// ClearPermissionCache clears expired entries from the permission cache.
func (ps *Service) ClearPermissionCache() {
	ps.cache.Clear()
}

// SetPermissionCacheTTL allows customizing the cache TTL for specific permissions.
func (ps *Service) SetPermissionCacheTTL(
	userID, workspaceID uint,
	resource db.PolicyResource,
	resourceID *uint,
	action db.PolicyAction,
	allowed bool,
	ttl time.Duration,
) {
	cacheKey := generateCacheKey(userID, workspaceID, resource, resourceID, action)
	ps.cache.Set(cacheKey, allowed, ttl)
}
