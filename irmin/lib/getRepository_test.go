package lib_test

import (
	"irmin-api/lib"
	"log/slog"
	"os"
	"testing"

	"github.com/zeebo/assert"
)

func TestGetRepository(t *testing.T) {
	ts := lib.GetTestSuite()

	// Create slog logger for testing
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))

	// Create a context
	ctx := t.Context()

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

	// Ensure test user is in workspace before running tests
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
	defer func() {
		if len(originalRoleIDs) == 0 {
			removeErr := ts.DB.RemoveUserFromWorkspace(user.ID, workspace.ID)
			if removeErr != nil {
				t.Logf("Failed to remove user from workspace during cleanup: %v", removeErr)
			}
		} else {
			restoreUserRoles(t, ts.DB, user.ID, workspace.ID, originalRoleIDs)
		}
	}()

	// Get the repository ignoring the cache
	repository, err := lib.GetRepository(
		ctx,
		"en",
		ts.DB,
		logger,
		ts.Env,
		workspace,
		ts.Env.TestRepository,
		true,
	)
	if err != nil {
		t.Fatalf("Failed to get repository ignoring cache: %v", err)
	}
	assert.NotNil(t, repository)
	assert.Equal(t, repository.Slug, ts.Env.TestRepository)
	assert.Equal(t, repository.WorkspaceID, workspace.ID)

	// Get the repository using the cache
	repositoryCached, err := lib.GetRepository(
		ctx,
		"en",
		ts.DB,
		logger,
		ts.Env,
		workspace,
		ts.Env.TestRepository,
		false,
	)
	if err != nil {
		t.Fatalf("Failed to get repository using cache: %v", err)
	}
	assert.DeepEqual(t, repository, repositoryCached)
}
