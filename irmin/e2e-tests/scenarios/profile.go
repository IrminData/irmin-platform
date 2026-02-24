package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-sdk-go/api"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// ProfileScenarios returns test cases for profile and workspace operations.
func ProfileScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "Profile_Get",
			Description: "Get the current user's profile",
			Run:         testGetProfile,
		},
		{
			Name:        "Profile_Update",
			Description: "Update the current user's profile",
			Run:         testUpdateProfile,
		},
		{
			Name:        "Workspace_Get",
			Description: "Get workspace details",
			Run:         testGetWorkspace,
		},
		{
			Name:        "Workspace_List_Users",
			Description: "List users in the workspace",
			Run:         testListWorkspaceUsers,
		},
	}
}

func testGetProfile(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	profile, _, err := client.GetProfile(ctx)
	if err != nil {
		return fmt.Errorf("failed to get profile: %w", err)
	}

	if profile.ID == "" {
		return fmt.Errorf("profile ID is empty")
	}

	if profile.Email == "" {
		return fmt.Errorf("profile email is empty")
	}

	return nil
}

func testUpdateProfile(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Get current profile
	profile, _, err := client.GetProfile(ctx)
	if err != nil {
		return fmt.Errorf("failed to get profile: %w", err)
	}

	originalFirstName := profile.FirstName

	// Update profile with a modified first name
	updatedFirstName := fmt.Sprintf("%s-E2E", profile.FirstName)
	_, _, err = client.UpdateProfile(ctx, &updatedFirstName, nil, nil, nil, nil, nil, nil)
	if err != nil {
		return fmt.Errorf("failed to update profile: %w", err)
	}

	// Verify update
	updatedProfile, _, err := client.GetProfile(ctx)
	if err != nil {
		return fmt.Errorf("failed to get updated profile: %w", err)
	}

	if updatedProfile.FirstName != updatedFirstName {
		return fmt.Errorf(
			"profile first name not updated: expected %q, got %q",
			updatedFirstName, updatedProfile.FirstName,
		)
	}

	// Restore original first name
	_, _, err = client.UpdateProfile(ctx, &originalFirstName, nil, nil, nil, nil, nil, nil)
	if err != nil {
		return fmt.Errorf("failed to restore profile first name: %w", err)
	}

	return nil
}

func testGetWorkspace(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	workspace, _, err := client.GetWorkspace(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to get workspace: %w", err)
	}

	if workspace.Slug != cfg.Workspace {
		return fmt.Errorf("workspace slug mismatch: expected %q, got %q", cfg.Workspace, workspace.Slug)
	}

	if workspace.Name == "" {
		return fmt.Errorf("workspace name is empty")
	}

	return nil
}

func testListWorkspaceUsers(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	users, _, err := client.ListUsers(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to list users: %w", err)
	}

	// Should have at least one user (the current user)
	if len(users) == 0 {
		return fmt.Errorf("no users found in workspace")
	}

	return nil
}
