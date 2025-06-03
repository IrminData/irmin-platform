package lib

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"irmin-api/db"
	"log/slog"
	"strconv"
	"sync"
	"time"
)

const (
	// DefaultCacheSize is the maximum number of entries allowed in the permission cache.
	DefaultCacheSize = 10000

	// CacheSizeReductionFactor is used to reduce cache size when it reaches the maximum
	// (e.g., if max size is 10000, we'll reduce to 5000 when cleaning).
	CacheSizeReductionFactor = 2

	// OwnerPermissionCacheTTL is how long to cache permissions for workspace owners.
	OwnerPermissionCacheTTL = 5 * time.Minute

	// DefaultPermissionCacheTTL is the default TTL for cached permissions.
	DefaultPermissionCacheTTL = time.Minute
)

// PermissionCacheEntry represents a cached permission result.
type PermissionCacheEntry struct {
	Allowed   bool
	ExpiresAt time.Time
}

// PermissionCache provides thread-safe caching for permission results.
type PermissionCache struct {
	mu       sync.RWMutex
	cache    map[string]PermissionCacheEntry
	maxSize  int
	cleanups int // Counter to trigger periodic cleanup
}

// NewPermissionCache creates a new permission cache.
func NewPermissionCache() *PermissionCache {
	return &PermissionCache{
		cache:   make(map[string]PermissionCacheEntry),
		maxSize: DefaultCacheSize, // Limit cache size to prevent memory issues
	}
}

// Get retrieves a cached permission result.
func (pc *PermissionCache) Get(key string) (bool, bool) {
	pc.mu.RLock()
	defer pc.mu.RUnlock()

	entry, exists := pc.cache[key]
	if !exists || time.Now().After(entry.ExpiresAt) {
		return false, false
	}
	return entry.Allowed, true
}

// Set stores a permission result in cache.
func (pc *PermissionCache) Set(key string, allowed bool, ttl time.Duration) {
	pc.mu.Lock()
	defer pc.mu.Unlock()

	// Lazy cleanup - clean expired entries periodically
	pc.cleanups++
	if pc.cleanups%100 == 0 { // Clean every 100 operations
		pc.cleanExpiredEntriesUnsafe()
	}

	// If cache is too large, clean expired entries and enforce size limit
	if len(pc.cache) >= pc.maxSize {
		pc.cleanExpiredEntriesUnsafe()
		if len(pc.cache) >= pc.maxSize {
			// If still too large after cleanup, remove oldest entries
			pc.enforceMaxSizeUnsafe()
		}
	}

	pc.cache[key] = PermissionCacheEntry{
		Allowed:   allowed,
		ExpiresAt: time.Now().Add(ttl),
	}
}

// cleanExpiredEntriesUnsafe removes expired entries (must be called with write lock).
func (pc *PermissionCache) cleanExpiredEntriesUnsafe() {
	now := time.Now()
	for key, entry := range pc.cache {
		if now.After(entry.ExpiresAt) {
			delete(pc.cache, key)
		}
	}
}

// enforceMaxSizeUnsafe removes oldest entries to maintain size limit (must be called with write lock).
func (pc *PermissionCache) enforceMaxSizeUnsafe() {
	// Simple approach: remove half the entries when we hit the limit
	// In a production system, you might want to implement LRU instead
	targetSize := pc.maxSize / CacheSizeReductionFactor
	count := 0
	for key := range pc.cache {
		if count >= targetSize {
			break
		}
		delete(pc.cache, key)
		count++
	}
}

// Clear removes expired entries from cache (now only used for testing).
func (pc *PermissionCache) Clear() {
	pc.mu.Lock()
	defer pc.mu.Unlock()
	pc.cleanExpiredEntriesUnsafe()
}

// PermissionService provides permission checking with caching.
type PermissionService struct {
	cache  *PermissionCache
	db     *db.Database
	logger *slog.Logger
}

// NewPermissionService creates a new permission service.
func NewPermissionService(db *db.Database, logger *slog.Logger) *PermissionService {
	return &PermissionService{
		cache:  NewPermissionCache(),
		db:     db,
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
}

// IsAllowed checks if a user is allowed to perform an action on a resource
// It checks for explicit deny policies first, then for allow policies, and returns false if no policies match
// It returns true if any allow policy matches, false if any deny policy matches, or an error if there's a database error
// Workspace owners are always allowed to perform any action on any resource (ownership defined based on workspace.OwnerID or role.IsOwner).
func (ps *PermissionService) IsAllowed(
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
		Select("effect, principal, workspace_user_id, role_id").
		Where("workspace_id = ? AND resource = ? AND action = ?", workspaceID, resource, action)

	// Handle resourceID properly - check for both specific resource and wildcard (resourceID = 0)
	if resourceID != nil {
		query = query.Where("(resource_id = ? OR resource_id = 0 OR resource_id IS NULL)", *resourceID)
	} else {
		query = query.Where("(resource_id = 0 OR resource_id IS NULL)")
	}

	// Add conditions for different principals
	var conditions []string
	var values []interface{}

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
	for i := 1; i < len(conditions); i++ {
		whereClause += fmt.Sprintf(" OR (%s)", conditions[i])
	}

	query = query.Where(whereClause, values...)

	// Execute the query
	if err := query.Find(&policies).Error; err != nil {
		return false, fmt.Errorf("failed to query policies: %w", err)
	}

	// Process results according to precedence rules
	return evaluatePolicies(policies, workspaceUserID, roleIDs), nil
}

type categorizedEffects struct {
	userDeny      bool
	userAllow     bool
	roleDeny      bool
	roleAllow     bool
	everyoneDeny  bool
	everyoneAllow bool
}

func updateUserEffects(policy PolicyMatch, workspaceUserID uint, effects *categorizedEffects) {
	if policy.WorkspaceUserID != nil && *policy.WorkspaceUserID == workspaceUserID {
		switch policy.Effect {
		case db.PolicyEffectDeny:
			effects.userDeny = true
		case db.PolicyEffectAllow:
			effects.userAllow = true
		}
	}
}

func updateRoleEffects(policy PolicyMatch, roleIDMap map[uint]bool, effects *categorizedEffects) {
	if policy.RoleID != nil && roleIDMap[*policy.RoleID] {
		switch policy.Effect {
		case db.PolicyEffectDeny:
			effects.roleDeny = true
		case db.PolicyEffectAllow:
			effects.roleAllow = true
		}
	}
}

func updateEveryoneEffects(policy PolicyMatch, effects *categorizedEffects) {
	switch policy.Effect {
	case db.PolicyEffectDeny:
		effects.everyoneDeny = true
	case db.PolicyEffectAllow:
		effects.everyoneAllow = true
	}
}

func categorizePolicyEffects(policies []PolicyMatch, workspaceUserID uint, roleIDMap map[uint]bool) categorizedEffects {
	effects := categorizedEffects{}

	for _, policy := range policies {
		switch policy.Principal {
		case db.PolicyPrincipalWorkspaceUser:
			updateUserEffects(policy, workspaceUserID, &effects)
		case db.PolicyPrincipalRole:
			updateRoleEffects(policy, roleIDMap, &effects)
		case db.PolicyPrincipalEveryone:
			updateEveryoneEffects(policy, &effects)
		}
	}
	return effects
}

// evaluatePolicies processes the matched policies according to precedence rules.
func evaluatePolicies(policies []PolicyMatch, workspaceUserID uint, roleIDs []uint) bool {
	roleIDMap := make(map[uint]bool, len(roleIDs))
	for _, id := range roleIDs {
		roleIDMap[id] = true
	}

	effects := categorizePolicyEffects(policies, workspaceUserID, roleIDMap)

	// Apply precedence rules: deny policies take precedence over allow policies
	// Order of precedence: user > role > everyone

	// Check deny policies first (highest precedence)
	if effects.userDeny {
		return false
	}
	if effects.roleDeny {
		return false
	}
	if effects.everyoneDeny {
		return false
	}

	// Check allow policies (in order of precedence)
	if effects.userAllow {
		return true
	}
	if effects.roleAllow {
		return true
	}
	if effects.everyoneAllow {
		return true
	}

	// Default deny if no policies match
	return false
}

// ClearPermissionCache clears expired entries from the permission cache.
func (ps *PermissionService) ClearPermissionCache() {
	ps.cache.Clear()
}

// SetPermissionCacheTTL allows customizing the cache TTL for specific permissions.
func (ps *PermissionService) SetPermissionCacheTTL(
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
