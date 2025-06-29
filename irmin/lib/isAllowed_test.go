package lib_test

import (
	"irmin-api/db"
	"irmin-api/lib"
	"log/slog"
	"testing"
	"time"

	"github.com/zeebo/assert"
	"gorm.io/gorm"
)

// restoreUserRoles restores the roles of a user in a workspace.
func restoreUserRoles(t *testing.T, d *db.Database, userID, workspaceID uint, roleIDs []uint) {
	err := d.Transaction(func(tx *gorm.DB) error {
		_, updateErr := d.UpdateWorkspaceUserRoles(tx, userID, workspaceID, roleIDs)
		return updateErr
	})
	assert.NoError(t, err)
}

// setUserRole sets a single role for a user in a workspace.
func setUserRole(t *testing.T, d *db.Database, userID, workspaceID uint, role *db.Role) {
	err := d.Transaction(func(tx *gorm.DB) error {
		_, updateErr := d.UpdateWorkspaceUserRoles(tx, userID, workspaceID, []uint{role.ID})
		return updateErr
	})
	assert.NoError(t, err)
}

// setupTestEnvironment prepares the test environment with necessary users and workspace.
func setupTestEnvironment(t *testing.T, ts *lib.TestSuite) (*db.Workspace, *db.User, *db.User, []uint, func()) {
	// Find the test workspace
	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Fatalf("Failed to get test workspace: %v", err)
	}

	// Find the test user
	user, err := ts.DB.GetUserByEmail(ts.Env.TestUserEmail)
	if err != nil {
		t.Fatalf("Failed to get test user: %v", err)
	}

	// Find the workspace owner user
	workspaceOwner, err := ts.DB.GetUser(workspace.OwnerID)
	if err != nil {
		t.Fatalf("Failed to get workspace owner: %v", err)
	}

	// Setup test user and ensure cleanup
	originalRoleIDs, cleanup := setupTestUser(t, ts, workspace, user)

	return workspace, user, workspaceOwner, originalRoleIDs, cleanup
}

// createTestCases creates the test cases for permission testing.
func createTestCases(
	t *testing.T,
	ts *lib.TestSuite,
	workspace *db.Workspace,
	user *db.User,
	workspaceOwner *db.User,
	roles []db.Role,
	originalRoleIDs []uint,
) []struct {
	name     string
	setup    func() ([]uint, func())
	resource db.PolicyResource
	action   db.PolicyAction
	want     bool
	wantErr  bool
	testUser *db.User
} {
	return []struct {
		name     string
		setup    func() ([]uint, func())
		resource db.PolicyResource
		action   db.PolicyAction
		want     bool
		wantErr  bool
		testUser *db.User
	}{
		{
			name: "workspace owner has full access",
			setup: func() ([]uint, func()) {
				// Set the test user as the workspace owner
				updateOwnerErr := ts.DB.Model(&db.Workspace{}).
					Where("id = ?", workspace.ID).
					Update("owner_id", user.ID).
					Error
				assert.NoError(t, updateOwnerErr)

				// Update the test user's roles to include the owner role
				ownerRole := findRole(roles, "owner")
				assert.NotNil(t, ownerRole)
				setUserRole(t, ts.DB, user.ID, workspace.ID, ownerRole)

				return originalRoleIDs, func() {
					// Restore the test user's roles
					restoreUserRoles(t, ts.DB, user.ID, workspace.ID, originalRoleIDs)

					// Restore the workspace owner
					restoreOwnerErr := ts.DB.Model(&db.Workspace{}).
						Where("id = ?", workspace.ID).
						Update("owner_id", workspaceOwner.ID).
						Error
					assert.NoError(t, restoreOwnerErr)
				}
			},
			resource: db.PolicyResourcePolicy,
			action:   db.PolicyActionCreate,
			want:     true,
			wantErr:  false,
			testUser: user,
		},
		{
			name: "viewer role has read access",
			setup: func() ([]uint, func()) {
				viewerRole := findRole(roles, "viewer")
				assert.NotNil(t, viewerRole)
				setUserRole(t, ts.DB, user.ID, workspace.ID, viewerRole)
				return originalRoleIDs, func() {
					restoreUserRoles(t, ts.DB, user.ID, workspace.ID, originalRoleIDs)
				}
			},
			resource: db.PolicyResourceConnection,
			action:   db.PolicyActionRead,
			want:     true,
			wantErr:  false,
			testUser: user,
		},
		{
			name: "viewer role cannot write",
			setup: func() ([]uint, func()) {
				viewerRole := findRole(roles, "viewer")
				assert.NotNil(t, viewerRole)
				setUserRole(t, ts.DB, user.ID, workspace.ID, viewerRole)
				return originalRoleIDs, func() {
					restoreUserRoles(t, ts.DB, user.ID, workspace.ID, originalRoleIDs)
				}
			},
			resource: db.PolicyResourceRepository,
			action:   db.PolicyActionUpdate,
			want:     false,
			wantErr:  false,
			testUser: user,
		},
		{
			name: "editor role has full access to workflows",
			setup: func() ([]uint, func()) {
				editorRole := findRole(roles, "editor")
				assert.NotNil(t, editorRole)
				setUserRole(t, ts.DB, user.ID, workspace.ID, editorRole)
				return originalRoleIDs, func() {
					restoreUserRoles(t, ts.DB, user.ID, workspace.ID, originalRoleIDs)
				}
			},
			resource: db.PolicyResourceWorkflow,
			action:   db.PolicyActionCreate,
			want:     true,
			wantErr:  false,
			testUser: user,
		},
		{
			name: "non-workspace user has no access",
			setup: func() ([]uint, func()) {
				// Remove user from workspace
				removeErr := ts.DB.Transaction(func(tx *gorm.DB) error {
					return ts.DB.RemoveUserFromWorkspace(tx, user.ID, workspace.ID)
				})
				assert.NoError(t, removeErr)

				return originalRoleIDs, func() {
					// Re-add user to workspace with original roles
					addErr := ts.DB.Transaction(func(tx *gorm.DB) error {
						_, err := ts.DB.AddUserToWorkspace(tx, user.ID, workspace.ID, originalRoleIDs)
						return err
					})
					assert.NoError(t, addErr)
				}
			},
			resource: db.PolicyResourceWorkspace,
			action:   db.PolicyActionRead,
			want:     false,
			wantErr:  true,
			testUser: user,
		},
	}
}

// TestPermissionService_IsAllowed tests the IsAllowed method of the PermissionService.
func TestPermissionService_IsAllowed(t *testing.T) {
	ts := lib.GetTestSuite()
	logger := slog.New(slog.NewTextHandler(nil, nil))
	ps := lib.NewPermissionService(ts.DB, logger)

	// Setup test environment
	workspace, user, workspaceOwner, originalRoleIDs, cleanup := setupTestEnvironment(t, ts)
	defer cleanup()

	// Get all roles
	roles, err := ts.DB.GetRoles()
	if err != nil {
		t.Fatalf("Failed to get all roles: %v", err)
	}

	// Create test cases
	tests := createTestCases(t, ts, workspace, user, workspaceOwner, roles, originalRoleIDs)

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, teardown := tt.setup()
			defer teardown()

			got, allowedErr := ps.IsAllowed(tt.testUser, workspace, tt.resource, nil, tt.action)

			assert.Equal(t, tt.want, got)
			if tt.wantErr {
				assert.Error(t, allowedErr)
			} else {
				assert.NoError(t, allowedErr)
			}
		})
	}
}

// TestResourceSpecificityPrecedence tests the resource specificity precedence.
func TestResourceSpecificityPrecedence(t *testing.T) {
	ts := lib.GetTestSuite()
	logger := slog.New(slog.NewTextHandler(nil, nil))
	ps := lib.NewPermissionService(ts.DB, logger)

	// Find the test workspace
	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Fatalf("Failed to get test workspace: %v", err)
	}

	// Find the test user
	user, err := ts.DB.GetUserByEmail(ts.Env.TestUserEmail)
	if err != nil {
		t.Fatalf("Failed to get test user: %v", err)
	}

	// Check if user is already in workspace, if not add them
	var originalRoleIDs []uint
	workspaceUser, err := ts.DB.GetWorkspaceUser(workspace.ID, user.ID)
	if err != nil {
		// User is not in workspace, add them with default roles
		roles, getRolesErr := ts.DB.GetRoles()
		if getRolesErr != nil {
			t.Fatalf("Failed to get roles: %v", getRolesErr)
		}

		// Find a default role (like viewer)
		viewerRole := findRole(roles, "viewer")
		if viewerRole == nil {
			t.Fatalf("Viewer role not found")
		}

		addTxErr := ts.DB.Transaction(func(tx *gorm.DB) error {
			_, addErr := ts.DB.AddUserToWorkspace(tx, user.ID, workspace.ID, []uint{viewerRole.ID})
			return addErr
		})
		if addTxErr != nil {
			t.Fatalf("Failed to add user to workspace: %v", addTxErr)
		}

		// Set original roles to empty since user wasn't in workspace before
		originalRoleIDs = []uint{}
	} else {
		// User is already in workspace, save their current roles
		originalRoleIDs = make([]uint, len(workspaceUser.Roles))
		for i, role := range workspaceUser.Roles {
			originalRoleIDs[i] = role.RoleID
		}
	}

	// Ensure cleanup happens
	defer func() {
		if len(originalRoleIDs) == 0 {
			// User wasn't in workspace originally, remove them
			removeTxErr := ts.DB.Transaction(func(tx *gorm.DB) error {
				return ts.DB.RemoveUserFromWorkspace(tx, user.ID, workspace.ID)
			})
			if removeTxErr != nil {
				t.Logf("Failed to remove user from workspace during cleanup: %v", removeTxErr)
			}
		} else {
			// Restore original roles
			restoreUserRoles(t, ts.DB, user.ID, workspace.ID, originalRoleIDs)
		}
	}()

	// Get a workflow to test with
	workflows, err := ts.DB.GetWorkflowsByWorkspaceID(workspace.ID)
	if err != nil {
		t.Fatalf("Failed to get workflows: %v", err)
	}
	if len(workflows) == 0 {
		t.Skip("No workflows available for testing")
	}
	testWorkflow := workflows[0]

	// Create policies for testing resource specificity
	// 1. Generic deny policy (should apply to all workflows)
	genericDenyPolicy := &db.Policy{
		WorkspaceID: workspace.ID,
		Principal:   db.PolicyPrincipalEveryone,
		Resource:    db.PolicyResourceWorkflow,
		Action:      db.PolicyActionRead,
		Effect:      db.PolicyEffectDeny,
		ResourceID:  nil, // Generic policy
	}
	err = ts.DB.Create(genericDenyPolicy).Error
	assert.NoError(t, err)
	defer ts.DB.Delete(genericDenyPolicy)

	// 2. Specific allow policy (should override generic deny for this specific workflow)
	specificAllowPolicy := &db.Policy{
		WorkspaceID: workspace.ID,
		Principal:   db.PolicyPrincipalEveryone,
		Resource:    db.PolicyResourceWorkflow,
		Action:      db.PolicyActionRead,
		Effect:      db.PolicyEffectAllow,
		ResourceID:  &testWorkflow.ID, // Specific to test workflow
	}
	err = ts.DB.Create(specificAllowPolicy).Error
	assert.NoError(t, err)
	defer ts.DB.Delete(specificAllowPolicy)

	t.Run("specific allow policy overrides generic deny", func(t *testing.T) {
		// Should return true because specific allow takes precedence over generic deny
		allowed, allowedErr := ps.IsAllowed(
			user,
			workspace,
			db.PolicyResourceWorkflow,
			&testWorkflow.ID,
			db.PolicyActionRead,
		)
		assert.NoError(t, allowedErr)
		assert.True(t, allowed)
	})

	t.Run("generic deny policy applies when no specific policy exists", func(t *testing.T) {
		// Use a non-existent workflow ID to test generic policy application
		nonExistentWorkflowID := uint(99999)

		// Should return false because only generic deny policy applies
		allowed, allowedErr := ps.IsAllowed(
			user,
			workspace,
			db.PolicyResourceWorkflow,
			&nonExistentWorkflowID,
			db.PolicyActionRead,
		)
		assert.NoError(t, allowedErr)
		assert.False(t, allowed)
	})
}

// TestPermissionCache tests the permission cache.
func TestPermissionCache(t *testing.T) {
	ts := lib.GetTestSuite()
	logger := slog.New(slog.NewTextHandler(nil, nil))
	ps := lib.NewPermissionService(ts.DB, logger)

	// Find the test workspace
	workspace, err := ts.DB.GetWorkspaceBySlug(ts.Env.TestWorkspace)
	if err != nil {
		t.Fatalf("Failed to get test workspace: %v", err)
	}

	// Find the test user
	user, err := ts.DB.GetUserByEmail(ts.Env.TestUserEmail)
	if err != nil {
		t.Fatalf("Failed to get test user: %v", err)
	}

	// Check if user is already in workspace, if not add them
	var originalRoleIDs []uint
	workspaceUser, err := ts.DB.GetWorkspaceUser(workspace.ID, user.ID)
	if err != nil {
		// User is not in workspace, add them with default roles
		roles, getRolesErr := ts.DB.GetRoles()
		if getRolesErr != nil {
			t.Fatalf("Failed to get roles: %v", getRolesErr)
		}

		// Find a default role (like viewer)
		viewerRole := findRole(roles, "viewer")
		if viewerRole == nil {
			t.Fatalf("Viewer role not found")
		}

		addTxErr := ts.DB.Transaction(func(tx *gorm.DB) error {
			_, addErr := ts.DB.AddUserToWorkspace(tx, user.ID, workspace.ID, []uint{viewerRole.ID})
			return addErr
		})
		if addTxErr != nil {
			t.Fatalf("Failed to add user to workspace: %v", addTxErr)
		}

		// Set original roles to empty since user wasn't in workspace before
		originalRoleIDs = []uint{}
	} else {
		// User is already in workspace, save their current roles
		originalRoleIDs = make([]uint, len(workspaceUser.Roles))
		for i, role := range workspaceUser.Roles {
			originalRoleIDs[i] = role.RoleID
		}
	}

	// Ensure cleanup happens
	defer func() {
		if len(originalRoleIDs) == 0 {
			// User wasn't in workspace originally, remove them
			removeErr := ts.DB.Transaction(func(tx *gorm.DB) error {
				return ts.DB.RemoveUserFromWorkspace(tx, user.ID, workspace.ID)
			})
			if removeErr != nil {
				t.Logf("Failed to remove user from workspace during cleanup: %v", removeErr)
			}
		} else {
			// Restore original roles
			restoreUserRoles(t, ts.DB, user.ID, workspace.ID, originalRoleIDs)
		}
	}()

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
