package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// RepositoryScenarios returns test cases for repository operations.
func RepositoryScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "Repository_Create_List_Delete",
			Description: "Create a repository, verify it appears in the list, then delete it",
			Run:         testRepositoryLifecycle,
		},
		{
			Name:        "Repository_Update",
			Description: "Create a repository, update its details, verify changes",
			Run:         testRepositoryUpdate,
		},
	}
}

func testRepositoryLifecycle(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	repoName := fmt.Sprintf("e2e-test-repo-%d", randomSuffix())

	// Create repository
	repo, _, err := client.CreateRepository(ctx, cfg.Workspace, irmincore.CreateRepositoryRequest{
		Name:          repoName,
		Description:   "E2E test repository - will be deleted",
		DefaultBranch: "main",
	})
	if err != nil {
		return fmt.Errorf("failed to create repository: %w", err)
	}

	// Verify repository appears in list
	repos, _, err := client.ListRepositories(ctx, cfg.Workspace)
	if err != nil {
		return fmt.Errorf("failed to list repositories: %w", err)
	}

	found := false
	for _, r := range repos {
		if r.Slug == repo.Slug {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("created repository not found in list")
	}

	// Get repository details
	fetchedRepo, _, err := client.GetRepository(ctx, cfg.Workspace, repo.Slug)
	if err != nil {
		return fmt.Errorf("failed to get repository: %w", err)
	}
	if fetchedRepo.Name != repoName {
		return fmt.Errorf("repository name mismatch: expected %q, got %q", repoName, fetchedRepo.Name)
	}

	// Clean up - delete repository
	if cfg.CleanupAfterTests {
		_, err = client.DeleteRepository(ctx, cfg.Workspace, repo.Slug)
		if err != nil {
			return fmt.Errorf("failed to delete repository: %w", err)
		}
	}

	return nil
}

func testRepositoryUpdate(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	repoName := fmt.Sprintf("e2e-test-repo-%d", randomSuffix())
	updatedDescription := "Updated description for E2E test"

	// Create repository
	repo, _, err := client.CreateRepository(ctx, cfg.Workspace, irmincore.CreateRepositoryRequest{
		Name:          repoName,
		Description:   "Initial description",
		DefaultBranch: "main",
	})
	if err != nil {
		return fmt.Errorf("failed to create repository: %w", err)
	}

	// Update repository
	_, _, err = client.UpdateRepository(ctx, cfg.Workspace, repo.Slug, irmincore.UpdateRepositoryRequest{
		Description: &updatedDescription,
	})
	if err != nil {
		return fmt.Errorf("failed to update repository: %w", err)
	}

	// Verify update
	fetchedRepo, _, err := client.GetRepository(ctx, cfg.Workspace, repo.Slug)
	if err != nil {
		return fmt.Errorf("failed to get repository: %w", err)
	}
	if fetchedRepo.Description != updatedDescription {
		return fmt.Errorf("repository description not updated: expected %q, got %q",
			updatedDescription, fetchedRepo.Description)
	}

	// Clean up
	if cfg.CleanupAfterTests {
		_, err = client.DeleteRepository(ctx, cfg.Workspace, repo.Slug)
		if err != nil {
			return fmt.Errorf("failed to delete repository: %w", err)
		}
	}

	return nil
}
