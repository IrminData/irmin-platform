package lib_test

import (
	"irmin-api/db"
	"irmin-api/lib"
	"log/slog"
	"slices"
	"testing"

	"github.com/zeebo/assert"
)

// setupTestUser ensures the test user is in the workspace with appropriate roles.
func setupTestUser(t *testing.T, ts *lib.TestSuite, workspace *db.Workspace, user *db.User) ([]uint, func()) {
	var originalRoleIDs []uint
	workspaceUser, err := ts.DB.GetWorkspaceUser(workspace.ID, user.ID)
	if err != nil {
		// User is not in workspace, add them with default roles
		roles, getRolesErr := ts.DB.GetRoles()
		if getRolesErr != nil {
			t.Fatalf("Failed to get roles: %v", getRolesErr)
		}

		viewerRole := findRole(roles, "viewer")
		if viewerRole == nil {
			t.Fatalf("Viewer role not found")
		}

		_, addErr := ts.DB.AddUserToWorkspace(user.ID, workspace.ID, []uint{viewerRole.ID})
		if addErr != nil {
			t.Fatalf("Failed to add user to workspace: %v", addErr)
		}

		originalRoleIDs = []uint{}
	} else {
		originalRoleIDs = make([]uint, len(workspaceUser.Roles))
		for i, role := range workspaceUser.Roles {
			originalRoleIDs[i] = role.RoleID
		}
	}

	cleanup := func() {
		if len(originalRoleIDs) == 0 {
			removeErr := ts.DB.RemoveUserFromWorkspace(user.ID, workspace.ID)
			if removeErr != nil {
				t.Logf("Failed to remove user from workspace during cleanup: %v", removeErr)
			}
		} else {
			restoreUserRoles(t, ts.DB, user.ID, workspace.ID, originalRoleIDs)
		}
	}

	return originalRoleIDs, cleanup
}

// createDenyPolicy creates a deny policy for a specific workflow.
func createDenyPolicy(t *testing.T, ts *lib.TestSuite, workspace *db.Workspace, workflowID uint) func() {
	denyPolicy := &db.Policy{
		WorkspaceID: workspace.ID,
		Principal:   db.PolicyPrincipalEveryone,
		Resource:    db.PolicyResourceWorkflow,
		Action:      db.PolicyActionRead,
		Effect:      db.PolicyEffectDeny,
		ResourceID:  &workflowID,
	}
	createPolicyErr := ts.DB.Create(denyPolicy).Error
	assert.NoError(t, createPolicyErr)

	return func() {
		deletePoliciesErr := ts.DB.Where(
			"workspace_id = ? AND resource = ? AND action = ? AND resource_id = ?",
			workspace.ID,
			db.PolicyResourceWorkflow,
			db.PolicyActionRead,
			workflowID,
		).Delete(&db.Policy{}).Error
		assert.NoError(t, deletePoliciesErr)
	}
}

func TestIsAllowedFilter(t *testing.T) {
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

	// Find the workspace owner user
	workspaceOwner, err := ts.DB.GetUser(workspace.OwnerID)
	if err != nil {
		t.Fatalf("Failed to get workspace owner: %v", err)
	}

	// Setup test user and ensure cleanup
	originalRoleIDs, cleanup := setupTestUser(t, ts, workspace, user)
	defer cleanup()

	// Get some workflows to test with
	workflows, err := ts.DB.GetWorkflowsByWorkspaceID(workspace.ID)
	if err != nil {
		t.Fatalf("Failed to get workflows: %v", err)
	}
	if len(workflows) < 2 {
		t.Skip("Need at least 2 workflows for testing")
	}

	// Get all roles
	roles, err := ts.DB.GetRoles()
	if err != nil {
		t.Fatalf("Failed to get all roles: %v", err)
	}

	// Create test cases
	tests := []struct {
		name          string
		setup         func() ([]uint, func())
		items         []db.Workflow
		expectedCount int
		expectedIDs   []uint
		resource      db.PolicyResource
		action        db.PolicyAction
		shouldError   bool
		testUser      *db.User
	}{
		{
			name: "filter with viewer role - should only see allowed workflows",
			setup: func() ([]uint, func()) {
				viewerRole := findRole(roles, "viewer")
				assert.NotNil(t, viewerRole)
				setUserRole(t, ts.DB, user.ID, workspace.ID, viewerRole)
				cleanupPolicy := createDenyPolicy(t, ts, workspace, workflows[0].ID)
				return originalRoleIDs, func() {
					cleanupPolicy()
					restoreUserRoles(t, ts.DB, user.ID, workspace.ID, originalRoleIDs)
				}
			},
			items:         workflows,
			expectedCount: len(workflows) - 1,
			expectedIDs: func() []uint {
				ids := make([]uint, 0, len(workflows)-1)
				for _, w := range workflows[1:] {
					ids = append(ids, w.ID)
				}
				return ids
			}(),
			resource:    db.PolicyResourceWorkflow,
			action:      db.PolicyActionRead,
			shouldError: false,
			testUser:    user,
		},
		{
			name: "workspace owner sees all workflows",
			setup: func() ([]uint, func()) {
				return nil, func() {}
			},
			items:         workflows,
			expectedCount: len(workflows),
			expectedIDs: func() []uint {
				ids := make([]uint, len(workflows))
				for i, w := range workflows {
					ids[i] = w.ID
				}
				return ids
			}(),
			resource:    db.PolicyResourceWorkflow,
			action:      db.PolicyActionRead,
			shouldError: false,
			testUser:    workspaceOwner,
		},
		{
			name: "non-workspace user sees no workflows",
			setup: func() ([]uint, func()) {
				removeErr := ts.DB.RemoveUserFromWorkspace(user.ID, workspace.ID)
				assert.NoError(t, removeErr)
				return originalRoleIDs, func() {
					_, addErr := ts.DB.AddUserToWorkspace(user.ID, workspace.ID, originalRoleIDs)
					assert.NoError(t, addErr)
				}
			},
			items:         workflows,
			expectedCount: 0,
			expectedIDs:   []uint{},
			resource:      db.PolicyResourceWorkflow,
			action:        db.PolicyActionRead,
			shouldError:   true,
			testUser:      user,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, teardown := tt.setup()
			defer teardown()

			filteredItems, isAllowedFilterErr := lib.IsAllowedFilter(
				ps,
				tt.testUser,
				workspace,
				tt.resource,
				tt.action,
				tt.items,
				func(w db.Workflow) uint { return w.ID },
			)

			if tt.shouldError {
				assert.Error(t, isAllowedFilterErr)
				return
			}
			assert.NoError(t, isAllowedFilterErr)

			assert.Equal(t, tt.expectedCount, len(filteredItems))

			gotIDs := make([]uint, len(filteredItems))
			for i, item := range filteredItems {
				gotIDs[i] = item.ID
			}
			slices.Sort(gotIDs)
			slices.Sort(tt.expectedIDs)
			assert.Equal(t, tt.expectedIDs, gotIDs)
		})
	}
}
