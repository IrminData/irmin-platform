package lib_test

import (
	"irmin-api/db"
	"irmin-api/lib"
	"irmin-api/tests"
	"log/slog"
	"testing"
	"time"

	"github.com/zeebo/assert"
)

// saveUserRoles saves the current roles of a user in a workspace.
func saveUserRoles(t *testing.T, d *db.Database, userID, workspaceID uint) []uint {
	workspaceUser, err := d.GetWorkspaceUser(workspaceID, userID)
	assert.NoError(t, err)

	roleIDs := make([]uint, len(workspaceUser.Roles))
	for i, role := range workspaceUser.Roles {
		roleIDs[i] = role.RoleID
	}
	return roleIDs
}

// restoreUserRoles restores the roles of a user in a workspace.
func restoreUserRoles(t *testing.T, d *db.Database, userID, workspaceID uint, roleIDs []uint) {
	_, err := d.UpdateWorkspaceUserRoles(userID, workspaceID, roleIDs)
	assert.NoError(t, err)
}

// setUserRole sets a single role for a user in a workspace.
func setUserRole(t *testing.T, d *db.Database, userID, workspaceID uint, role *db.Role) {
	_, err := d.UpdateWorkspaceUserRoles(userID, workspaceID, []uint{role.ID})
	assert.NoError(t, err)
}

func TestPermissionService_IsAllowed(t *testing.T) {
	env, d, err := tests.InitTestEnv()
	if err != nil {
		t.Fatalf("Failed to initialize test environment: %v", err)
	}

	logger := slog.New(slog.NewTextHandler(nil, nil))
	ps := lib.NewPermissionService(d, logger)

	// Find the test workspace
	workspace, err := d.GetWorkspaceBySlug(env.TestWorkspace)
	if err != nil {
		t.Fatalf("Failed to get test workspace: %v", err)
	}

	// Find the test user
	user, err := d.GetUserByEmail(env.TestUserEmail)
	if err != nil {
		t.Fatalf("Failed to get test user: %v", err)
	}

	// Find the workspace owner user
	// Please make sure that the workspace owner is not the test user
	workspaceOwner, err := d.GetUser(workspace.OwnerID)
	if err != nil {
		t.Fatalf("Failed to get workspace owner: %v", err)
	}

	// Get all roles
	roles, err := d.GetRoles()
	if err != nil {
		t.Fatalf("Failed to get all roles: %v", err)
	}

	// Test cases
	tests := []struct {
		name     string
		setup    func() []uint // Returns role IDs to restore
		teardown func([]uint)  // Restores roles
		resource db.PolicyResource
		action   db.PolicyAction
		want     bool
		wantErr  bool
	}{
		{
			name: "workspace owner has full access",
			setup: func() []uint {
				roleIDs := saveUserRoles(t, d, user.ID, workspace.ID)

				// Set the test user as the workspace owner
				updateOwnerErr := d.Model(&db.Workspace{}).
					Where("id = ?", workspace.ID).
					Update("owner_id", user.ID).
					Error
				assert.NoError(t, updateOwnerErr)

				// Update the test user's roles to include the owner role
				ownerRole := findRole(roles, "owner")
				assert.NotNil(t, ownerRole)
				setUserRole(t, d, user.ID, workspace.ID, ownerRole)

				return roleIDs
			},
			teardown: func(roleIDs []uint) {
				// Restore the test user's roles
				restoreUserRoles(t, d, user.ID, workspace.ID, roleIDs)

				// Restore the workspace owner
				updateOwnerErr := d.Model(&db.Workspace{}).
					Where("id = ?", workspace.ID).
					Update("owner_id", workspaceOwner.ID).
					Error
				assert.NoError(t, updateOwnerErr)
			},
			resource: db.PolicyResourcePolicy,
			action:   db.PolicyActionCreate,
			want:     true,
			wantErr:  false,
		},
		{
			name: "viewer role has read access",
			setup: func() []uint {
				roleIDs := saveUserRoles(t, d, user.ID, workspace.ID)

				viewerRole := findRole(roles, "viewer")
				assert.NotNil(t, viewerRole)
				setUserRole(t, d, user.ID, workspace.ID, viewerRole)
				return roleIDs
			},
			teardown: func(roleIDs []uint) {
				restoreUserRoles(t, d, user.ID, workspace.ID, roleIDs)
			},
			resource: db.PolicyResourceConnection,
			action:   db.PolicyActionRead,
			want:     true,
			wantErr:  false,
		},
		{
			name: "viewer role cannot write",
			setup: func() []uint {
				roleIDs := saveUserRoles(t, d, user.ID, workspace.ID)

				viewerRole := findRole(roles, "viewer")
				assert.NotNil(t, viewerRole)
				setUserRole(t, d, user.ID, workspace.ID, viewerRole)
				return roleIDs
			},
			teardown: func(roleIDs []uint) {
				restoreUserRoles(t, d, user.ID, workspace.ID, roleIDs)
			},
			resource: db.PolicyResourceRepository,
			action:   db.PolicyActionUpdate,
			want:     false,
			wantErr:  false,
		},
		{
			name: "editor role has full access to workflows",
			setup: func() []uint {
				roleIDs := saveUserRoles(t, d, user.ID, workspace.ID)

				editorRole := findRole(roles, "editor")
				assert.NotNil(t, editorRole)
				setUserRole(t, d, user.ID, workspace.ID, editorRole)
				return roleIDs
			},
			teardown: func(roleIDs []uint) {
				restoreUserRoles(t, d, user.ID, workspace.ID, roleIDs)
			},
			resource: db.PolicyResourceWorkflow,
			action:   db.PolicyActionCreate,
			want:     true,
			wantErr:  false,
		},
		{
			name: "non-workspace user has no access",
			setup: func() []uint {
				roleIDs := saveUserRoles(t, d, user.ID, workspace.ID)

				// Remove user from workspace
				removeErr := d.RemoveUserFromWorkspace(user.ID, workspace.ID)
				assert.NoError(t, removeErr)

				return roleIDs
			},
			teardown: func(roleIDs []uint) {
				// Re-add user to workspace with original roles
				workspaceUser, addErr := d.AddUserToWorkspace(user.ID, workspace.ID, roleIDs)
				assert.NoError(t, addErr)
				assert.NotNil(t, workspaceUser)
			},
			resource: db.PolicyResourceWorkspace,
			action:   db.PolicyActionRead,
			want:     false,
			wantErr:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup test case and get original roles
			roleIDs := tt.setup()
			// Ensure teardown happens even if test fails
			defer tt.teardown(roleIDs)

			// Run test
			got, allowedErr := ps.IsAllowed(user, workspace, tt.resource, nil, tt.action)

			// Verify results
			assert.Equal(t, tt.want, got)
			if tt.wantErr {
				assert.Error(t, allowedErr)
			} else {
				assert.NoError(t, allowedErr)
			}
		})
	}
}

func TestPermissionCache(t *testing.T) {
	env, d, err := tests.InitTestEnv()
	if err != nil {
		t.Fatalf("Failed to initialize test environment: %v", err)
	}

	logger := slog.New(slog.NewTextHandler(nil, nil))
	ps := lib.NewPermissionService(d, logger)

	// Find the test workspace
	workspace, err := d.GetWorkspaceBySlug(env.TestWorkspace)
	if err != nil {
		t.Fatalf("Failed to get test workspace: %v", err)
	}

	// Find the test user
	user, err := d.GetUserByEmail(env.TestUserEmail)
	if err != nil {
		t.Fatalf("Failed to get test user: %v", err)
	}

	// Save original roles to restore after tests
	originalRoleIDs := saveUserRoles(t, d, user.ID, workspace.ID)
	defer restoreUserRoles(t, d, user.ID, workspace.ID, originalRoleIDs)

	// Test cache hit/miss
	t.Run("cache operations", func(t *testing.T) {
		// First call should miss cache
		allowed1, allowedErr := ps.IsAllowed(user, workspace, db.PolicyResourceWorkspace, nil, db.PolicyActionRead)
		assert.NoError(t, allowedErr)
		assert.True(t, allowed1)

		// Second call should hit cache
		allowed2, allowedErr := ps.IsAllowed(user, workspace, db.PolicyResourceWorkspace, nil, db.PolicyActionRead)
		assert.NoError(t, allowedErr)
		assert.True(t, allowed2)

		// Clear cache
		ps.ClearPermissionCache()

		// Call after clear should miss cache
		allowed3, allowedErr := ps.IsAllowed(user, workspace, db.PolicyResourceWorkspace, nil, db.PolicyActionRead)
		assert.NoError(t, allowedErr)
		assert.True(t, allowed3)
	})

	// Test cache expiration
	t.Run("cache expiration", func(t *testing.T) {
		// Set a permission with very short TTL
		ps.SetPermissionCacheTTL(
			user.ID,
			workspace.ID,
			db.PolicyResourceWorkspace,
			nil,
			db.PolicyActionRead,
			true,
			100*time.Millisecond,
		)

		// First call should hit cache
		allowed1, allowedErr := ps.IsAllowed(user, workspace, db.PolicyResourceWorkspace, nil, db.PolicyActionRead)
		assert.NoError(t, allowedErr)
		assert.True(t, allowed1)

		// Wait for cache to expire
		time.Sleep(200 * time.Millisecond)

		// Call after expiration should miss cache
		allowed2, allowedErr := ps.IsAllowed(user, workspace, db.PolicyResourceWorkspace, nil, db.PolicyActionRead)
		assert.NoError(t, allowedErr)
		assert.True(t, allowed2)
	})
}

// Helper function to find a role by name.
func findRole(roles []db.Role, name string) *db.Role {
	for _, role := range roles {
		if role.Role == name {
			return &role
		}
	}
	return nil
}
