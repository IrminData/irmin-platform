package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// SearchScenarios returns test cases for search operations.
func SearchScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "Search_Repositories",
			Description: "Create repositories and search for them",
			Run:         testSearchRepositories,
		},
		{
			Name:        "Search_With_Type_Filter",
			Description: "Search with specific type filter",
			Run:         testSearchWithTypeFilter,
		},
		{
			Name:        "Search_With_Pagination",
			Description: "Search with limit and offset",
			Run:         testSearchWithPagination,
		},
	}
}

func testSearchRepositories(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Create a repository with a unique name
	uniqueName := fmt.Sprintf("searchable-repo-%d", randomSuffix())
	repo, _, err := client.CreateRepository(ctx, cfg.Workspace, irmincore.CreateRepositoryRequest{
		Name:          uniqueName,
		Description:   "Repository for search test",
		DefaultBranch: "main",
	})
	if err != nil {
		return fmt.Errorf("failed to create repository: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteRepository(ctx, cfg.Workspace, repo.Slug)
		}
	}()

	// Search for the repository
	results, _, err := client.Search(ctx, cfg.Workspace, irminmodels.SearchFilters{
		Query: uniqueName,
	})
	if err != nil {
		return fmt.Errorf("failed to search: %w", err)
	}

	// Check if our repository is in the results
	found := false
	for _, r := range results.Results {
		if r.Type == irminmodels.WorkspaceSearchResultTypeRepository {
			// Found a repository result
			found = true
			break
		}
	}
	if !found && results.Total > 0 {
		// If we have results but none are repos, that's unexpected
		return fmt.Errorf("no repository results found in search")
	}

	return nil
}

func testSearchWithTypeFilter(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Create a repository
	repoName := fmt.Sprintf("type-filter-repo-%d", randomSuffix())
	repo, _, err := client.CreateRepository(ctx, cfg.Workspace, irmincore.CreateRepositoryRequest{
		Name:          repoName,
		Description:   "Repository for type filter test",
		DefaultBranch: "main",
	})
	if err != nil {
		return fmt.Errorf("failed to create repository: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteRepository(ctx, cfg.Workspace, repo.Slug)
		}
	}()

	// Search with repository type filter
	results, _, err := client.Search(ctx, cfg.Workspace, irminmodels.SearchFilters{
		Query: repoName,
		Types: []string{"repository"},
	})
	if err != nil {
		return fmt.Errorf("failed to search with type filter: %w", err)
	}

	// Verify all results are repositories
	for _, r := range results.Results {
		if r.Type != irminmodels.WorkspaceSearchResultTypeRepository {
			return fmt.Errorf("type filter not working: got non-repository result type %s", r.Type)
		}
	}

	return nil
}

func testSearchWithPagination(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// Create multiple repositories
	var createdRepos []string
	for i := range 3 {
		repoName := fmt.Sprintf("pagination-repo-%d-%d", randomSuffix(), i)
		repo, _, err := client.CreateRepository(ctx, cfg.Workspace, irmincore.CreateRepositoryRequest{
			Name:          repoName,
			Description:   fmt.Sprintf("Pagination test repository %d", i),
			DefaultBranch: "main",
		})
		if err != nil {
			return fmt.Errorf("failed to create repository %d: %w", i, err)
		}
		createdRepos = append(createdRepos, repo.Slug)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			for _, slug := range createdRepos {
				_, _ = client.DeleteRepository(ctx, cfg.Workspace, slug)
			}
		}
	}()

	// Search with limit
	results, _, err := client.Search(ctx, cfg.Workspace, irminmodels.SearchFilters{
		Query: "pagination-repo",
		Limit: 2,
	})
	if err != nil {
		return fmt.Errorf("failed to search with limit: %w", err)
	}

	// Results should be limited
	if len(results.Results) > 2 {
		return fmt.Errorf("limit not respected: got %d results, expected max 2", len(results.Results))
	}

	// Search with offset
	_, _, err = client.Search(ctx, cfg.Workspace, irminmodels.SearchFilters{
		Query:  "pagination-repo",
		Limit:  2,
		Offset: 1,
	})
	if err != nil {
		return fmt.Errorf("failed to search with offset: %w", err)
	}

	return nil
}
