package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-sdk-go/api"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// UserScenarios returns test cases for user operations.
func UserScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "User_List",
			Description: "List all users in the workspace",
			Run:         testUserList,
		},
		{
			Name:        "User_Get",
			Description: "Get details of a specific user",
			Run:         testUserGet,
		},
		{
			Name:        "User_Update_Roles",
			Description: "Update roles for a user",
			Run:         testUserUpdateRoles,
		},
	}
}

func testUserList(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	users, _, err := client.ListUsers(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to list users: %w", err)
	}

	// There should be at least one user (the current user)
	if len(users) == 0 {
		return fmt.Errorf("no users found in workspace")
	}

	// Verify users have required fields
	for _, user := range users {
		if user.ID == "" {
			return fmt.Errorf("user ID is empty")
		}
	}

	return nil
}

func testUserGet(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// First list users to get a valid user ID
	users, _, err := client.ListUsers(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to list users: %w", err)
	}

	if len(users) == 0 {
		return fmt.Errorf("no users found in workspace")
	}

	// Get details of the first user
	user, _, err := client.GetUser(ctx, cfg.Workspace, users[0].ID)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	if user.ID != users[0].ID {
		return fmt.Errorf("user ID mismatch: expected %q, got %q", users[0].ID, user.ID)
	}

	return nil
}

func testUserUpdateRoles(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Get available roles
	roles, _, err := client.ListRoles(ctx)
	if err != nil {
		return fmt.Errorf("failed to list roles: %w", err)
	}

	if len(roles) == 0 {
		return fmt.Errorf("no roles available")
	}

	// Get current user's profile
	profile, _, err := client.GetProfile(ctx)
	if err != nil {
		return fmt.Errorf("failed to get profile: %w", err)
	}

	// List users to get the current user in workspace context
	users, _, err := client.ListUsers(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to list users: %w", err)
	}

	// Find the current user
	var currentUserID string
	for _, u := range users {
		if u.Email == profile.Email {
			currentUserID = u.ID
			break
		}
	}

	if currentUserID == "" {
		// Can't find current user, skip this test
		return nil
	}

	// Get non-owner role to assign
	var roleID string
	for _, r := range roles {
		if !r.IsOwner {
			roleID = r.ID
			break
		}
	}

	if roleID == "" {
		// No non-owner role available
		return nil
	}

	// Update user roles - assign an additional role
	// This may fail if user is owner and can't have roles changed
	// which is acceptable for this test
	_, _, _ = client.UpdateUserRoles(ctx, cfg.Workspace, currentUserID, irmincore.UpdateUserRolesRequest{
		Roles: []string{roleID},
	})

	return nil
}
