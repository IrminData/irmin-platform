package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-sdk-go/api"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// WorkspaceScenarios returns test cases for workspace operations.
func WorkspaceScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "Workspace_List",
			Description: "List all workspaces for the current user",
			Run:         testWorkspaceList,
		},
		{
			Name:        "Workspace_Get",
			Description: "Get details of the current workspace",
			Run:         testWorkspaceGet,
		},
		{
			Name:        "Workspace_Update",
			Description: "Update workspace name and description",
			Run:         testWorkspaceUpdate,
		},
		{
			Name:        "Workspace_Create_Delete",
			Description: "Create a new workspace and delete it",
			Run:         testWorkspaceCreateDelete,
		},
		{
			Name:        "Workspace_Schema",
			Description: "Get workspace schema",
			Run:         testWorkspaceSchema,
		},
	}
}

func testWorkspaceList(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	workspaces, _, err := client.ListWorkspaces(ctx)
	if err != nil {
		return fmt.Errorf("failed to list workspaces: %w", err)
	}

	// Should have at least the current workspace
	found := false
	for _, ws := range workspaces {
		if ws.Slug == cfg.Workspace {
			found = true
			break
		}
	}

	if !found {
		return fmt.Errorf("current workspace %q not found in list", cfg.Workspace)
	}

	return nil
}

func testWorkspaceGet(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	workspace, _, err := client.GetWorkspace(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to get workspace: %w", err)
	}

	if workspace.Slug != cfg.Workspace {
		return fmt.Errorf("workspace slug mismatch: expected %q, got %q", cfg.Workspace, workspace.Slug)
	}

	return nil
}

func testWorkspaceUpdate(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Get current workspace
	workspace, _, err := client.GetWorkspace(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to get workspace: %w", err)
	}

	originalName := workspace.Name
	originalDesc := workspace.Description

	// Update workspace
	newName := fmt.Sprintf("E2E Updated Workspace %d", randomSuffix())
	newDesc := "Updated by E2E test"

	_, _, err = client.UpdateWorkspace(ctx, cfg.Workspace, irmincore.UpdateWorkspaceRequest{
		Name:        &newName,
		Description: &newDesc,
	})
	if err != nil {
		return fmt.Errorf("failed to update workspace: %w", err)
	}

	// Verify update
	updated, _, err := client.GetWorkspace(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to get updated workspace: %w", err)
	}

	if updated.Name != newName {
		return fmt.Errorf("workspace name not updated: expected %q, got %q", newName, updated.Name)
	}

	// Restore original values
	_, _, err = client.UpdateWorkspace(ctx, cfg.Workspace, irmincore.UpdateWorkspaceRequest{
		Name:        &originalName,
		Description: &originalDesc,
	})
	if err != nil {
		return fmt.Errorf("failed to restore workspace: %w", err)
	}

	return nil
}

func testWorkspaceCreateDelete(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Create a new workspace
	workspaceName := fmt.Sprintf("e2e-temp-workspace-%d", randomSuffix())

	workspace, _, err := client.CreateWorkspace(ctx, irmincore.CreateWorkspaceRequest{
		Name:        workspaceName,
		Description: "Temporary workspace for E2E testing",
	})
	if err != nil {
		return fmt.Errorf("failed to create workspace: %w", err)
	}

	if workspace.Slug == "" {
		return fmt.Errorf("created workspace has empty slug")
	}

	// Delete the workspace
	if cfg.CleanupAfterTests {
		_, err = client.DeleteWorkspace(ctx, workspace.Slug)
		if err != nil {
			return fmt.Errorf("failed to delete workspace: %w", err)
		}
	}

	return nil
}

func testWorkspaceSchema(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	schema, _, err := client.GetWorkspaceSchema(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to get workspace schema: %w", err)
	}

	// Schema should exist (may or may not have columns depending on workspace content)
	_ = schema

	return nil
}
