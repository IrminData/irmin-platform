package lib_test

import (
	"irmin-api/db"
	"irmin-api/lib"
	"log/slog"
	"slices"
	"testing"

	"github.com/zeebo/assert"
)

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
		setup         func() []uint
		teardown      func([]uint)
		items         []db.Workflow
		expectedCount int
		expectedIDs   []uint
		resource      db.PolicyResource
		action        db.PolicyAction
		shouldError   bool
	}{
		{
			name: "filter with viewer role - should only see allowed workflows",
			setup: func() []uint {
				roleIDs := saveUserRoles(t, ts.DB, user.ID, workspace.ID)

				// Set user as viewer
				viewerRole := findRole(roles, "viewer")
				assert.NotNil(t, viewerRole)
				setUserRole(t, ts.DB, user.ID, workspace.ID, viewerRole)

				// Create a deny policy for the first workflow
				denyPolicy := &db.Policy{
					WorkspaceID: workspace.ID,
					Principal:   db.PolicyPrincipalEveryone,
					Resource:    db.PolicyResourceWorkflow,
					Action:      db.PolicyActionRead,
					Effect:      db.PolicyEffectDeny,
					ResourceID:  &workflows[0].ID,
				}
				createPolicyErr := ts.DB.Create(denyPolicy).Error
				assert.NoError(t, createPolicyErr)

				return roleIDs
			},
			teardown: func(roleIDs []uint) {
				// Clean up the deny policy
				deletePoliciesErr := ts.DB.Where(
					"workspace_id = ? AND resource = ? AND action = ? AND resource_id = ?",
					workspace.ID,
					db.PolicyResourceWorkflow,
					db.PolicyActionRead,
					workflows[0].ID,
				).Delete(&db.Policy{}).Error
				assert.NoError(t, deletePoliciesErr)

				restoreUserRoles(t, ts.DB, user.ID, workspace.ID, roleIDs)
			},
			items:         workflows,
			expectedCount: len(workflows) - 1, // All except the denied one
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
		},
		{
			name: "workspace owner sees all workflows",
			setup: func() []uint {
				// No need to change owner, just use the real owner
				return nil
			},
			teardown: func(_ []uint) {
				// No teardown needed
			},
			items:         workflows,
			expectedCount: len(workflows), // Owner sees all
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
		},
		{
			name: "non-workspace user sees no workflows",
			setup: func() []uint {
				roleIDs := saveUserRoles(t, ts.DB, user.ID, workspace.ID)

				// Remove user from workspace
				removeErr := ts.DB.RemoveUserFromWorkspace(user.ID, workspace.ID)
				assert.NoError(t, removeErr)

				return roleIDs
			},
			teardown: func(roleIDs []uint) {
				// Re-add user to workspace
				workspaceUser, addErr := ts.DB.AddUserToWorkspace(user.ID, workspace.ID, roleIDs)
				assert.NoError(t, addErr)
				assert.NotNil(t, workspaceUser)
			},
			items:         workflows,
			expectedCount: 0, // Non-workspace user sees none
			expectedIDs:   []uint{},
			resource:      db.PolicyResourceWorkflow,
			action:        db.PolicyActionRead,
			shouldError:   true, // Should error because user is not in workspace
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Setup test case
			roleIDs := tt.setup()
			defer tt.teardown(roleIDs)

			// Use workspace owner for the owner test case, otherwise use test user
			testUser := user
			if tt.name == "workspace owner sees all workflows" {
				testUser = workspaceOwner
			}

			// Run the filter
			filteredItems, isAllowedFilterErr := lib.IsAllowedFilter(
				ps,
				testUser,
				workspace,
				tt.resource,
				tt.action,
				tt.items,
				func(w db.Workflow) uint { return w.ID },
			)

			// Check error condition
			if tt.shouldError {
				assert.Error(t, isAllowedFilterErr)
				return
			}
			assert.NoError(t, isAllowedFilterErr)

			// Verify results
			assert.Equal(t, tt.expectedCount, len(filteredItems))

			// Check that we got the expected workflow IDs
			gotIDs := make([]uint, len(filteredItems))
			for i, item := range filteredItems {
				gotIDs[i] = item.ID
			}
			// Sort both slices to ensure consistent comparison
			slices.Sort(gotIDs)
			slices.Sort(tt.expectedIDs)
			assert.Equal(t, tt.expectedIDs, gotIDs)
		})
	}
}
