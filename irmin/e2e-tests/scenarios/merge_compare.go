package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// MergeCompareScenarios returns test cases for merge and compare operations.
func MergeCompareScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "Compare_Branches",
			Description: "Create branches with different content and compare them",
			Run:         testCompareBranches,
		},
		{
			Name:        "Merge_Branches",
			Description: "Create a feature branch, make changes, and merge into main",
			Run:         testMergeBranches,
		},
		{
			Name:        "Merge_With_Squash",
			Description: "Merge branches with squash option",
			Run:         testMergeWithSquash,
		},
		{
			Name:        "Compare_With_No_Differences",
			Description: "Compare two refs that are identical",
			Run:         testCompareNoDifferences,
		},
	}
}

func testCompareBranches(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	repoName := fmt.Sprintf("e2e-compare-test-%d", randomSuffix())
	repo, _, err := client.CreateRepository(ctx, cfg.Workspace, irmincore.CreateRepositoryRequest{
		Name:          repoName,
		Description:   "E2E compare test repository",
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

	// Create initial file on main
	files := map[string][]byte{
		"main.csv": []byte("id,value\n1,main\n"),
	}
	_, _, err = client.UploadObject(ctx, cfg.Workspace, repo.Slug, "main", "data/main.csv", files)
	if err != nil {
		return fmt.Errorf("failed to upload file to main: %w", err)
	}

	_, _, err = client.CreateCommit(ctx, cfg.Workspace, repo.Slug, irmincore.CreateCommitRequest{
		Branch:  "main",
		Message: "Initial commit on main",
	})
	if err != nil {
		return fmt.Errorf("failed to commit on main: %w", err)
	}

	// Create feature branch
	featureBranch := "feature-compare-test"
	_, _, err = client.CreateBranch(ctx, cfg.Workspace, repo.Slug, irmincore.CreateBranchRequest{
		Name: featureBranch,
		From: "main",
	})
	if err != nil {
		return fmt.Errorf("failed to create feature branch: %w", err)
	}

	// Add a file on the feature branch
	featureFiles := map[string][]byte{
		"feature.csv": []byte("id,value\n1,feature\n"),
	}
	_, _, err = client.UploadObject(ctx, cfg.Workspace, repo.Slug, featureBranch, "data/feature.csv", featureFiles)
	if err != nil {
		return fmt.Errorf("failed to upload file to feature branch: %w", err)
	}

	_, _, err = client.CreateCommit(ctx, cfg.Workspace, repo.Slug, irmincore.CreateCommitRequest{
		Branch:  featureBranch,
		Message: "Add feature file",
	})
	if err != nil {
		return fmt.Errorf("failed to commit on feature branch: %w", err)
	}

	// Compare branches
	diff, _, err := client.CompareRefs(ctx, cfg.Workspace, repo.Slug, "main", featureBranch)
	if err != nil {
		return fmt.Errorf("failed to compare refs: %w", err)
	}

	// Should have at least one difference (the new file)
	if len(diff.Items) == 0 {
		return fmt.Errorf("expected differences between branches, got none")
	}

	return nil
}

func testMergeBranches(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	repoName := fmt.Sprintf("e2e-merge-test-%d", randomSuffix())
	repo, _, err := client.CreateRepository(ctx, cfg.Workspace, irmincore.CreateRepositoryRequest{
		Name:          repoName,
		Description:   "E2E merge test repository",
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

	// Create initial file on main
	files := map[string][]byte{
		"base.csv": []byte("id,value\n1,base\n"),
	}
	_, _, err = client.UploadObject(ctx, cfg.Workspace, repo.Slug, "main", "data/base.csv", files)
	if err != nil {
		return fmt.Errorf("failed to upload file to main: %w", err)
	}

	_, _, err = client.CreateCommit(ctx, cfg.Workspace, repo.Slug, irmincore.CreateCommitRequest{
		Branch:  "main",
		Message: "Initial commit",
	})
	if err != nil {
		return fmt.Errorf("failed to commit on main: %w", err)
	}

	// Create feature branch
	featureBranch := "feature-merge-test"
	_, _, err = client.CreateBranch(ctx, cfg.Workspace, repo.Slug, irmincore.CreateBranchRequest{
		Name: featureBranch,
		From: "main",
	})
	if err != nil {
		return fmt.Errorf("failed to create feature branch: %w", err)
	}

	// Add files on the feature branch
	newFiles := map[string][]byte{
		"new.csv": []byte("id,value\n1,new\n"),
	}
	_, _, err = client.UploadObject(ctx, cfg.Workspace, repo.Slug, featureBranch, "data/new.csv", newFiles)
	if err != nil {
		return fmt.Errorf("failed to upload file to feature branch: %w", err)
	}

	_, _, err = client.CreateCommit(ctx, cfg.Workspace, repo.Slug, irmincore.CreateCommitRequest{
		Branch:  featureBranch,
		Message: "Add new file on feature branch",
	})
	if err != nil {
		return fmt.Errorf("failed to commit on feature branch: %w", err)
	}

	// Merge feature into main
	mergeCommit, _, err := client.MergeRefs(ctx, cfg.Workspace, repo.Slug, irmincore.MergeRefsRequest{
		BaseRef:     "main",
		CompareRef:  featureBranch,
		Description: "Merge feature branch",
		Strategy:    "default",
	})
	if err != nil {
		return fmt.Errorf("failed to merge: %w", err)
	}

	if mergeCommit.Hash == "" {
		return fmt.Errorf("merge commit hash is empty")
	}

	// Verify the file from feature branch is now on main
	_, _, err = client.GetObjectAtPath(ctx, cfg.Workspace, repo.Slug, "data/new.csv", "main")
	if err != nil {
		return fmt.Errorf("failed to find merged file on main: %w", err)
	}

	return nil
}

func testMergeWithSquash(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	repoName := fmt.Sprintf("e2e-squash-test-%d", randomSuffix())
	repo, _, err := client.CreateRepository(ctx, cfg.Workspace, irmincore.CreateRepositoryRequest{
		Name:          repoName,
		Description:   "E2E squash merge test repository",
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

	// Initial setup on main
	files := map[string][]byte{
		"init.csv": []byte("id,value\n1,init\n"),
	}
	_, _, err = client.UploadObject(ctx, cfg.Workspace, repo.Slug, "main", "data/init.csv", files)
	if err != nil {
		return fmt.Errorf("failed to upload file: %w", err)
	}

	_, _, err = client.CreateCommit(ctx, cfg.Workspace, repo.Slug, irmincore.CreateCommitRequest{
		Branch:  "main",
		Message: "Initial commit",
	})
	if err != nil {
		return fmt.Errorf("failed to commit: %w", err)
	}

	// Create feature branch
	featureBranch := "feature-squash-test"
	_, _, err = client.CreateBranch(ctx, cfg.Workspace, repo.Slug, irmincore.CreateBranchRequest{
		Name: featureBranch,
		From: "main",
	})
	if err != nil {
		return fmt.Errorf("failed to create feature branch: %w", err)
	}

	// Make multiple commits on feature branch
	for i := 1; i <= 3; i++ {
		commitFiles := map[string][]byte{
			fmt.Sprintf("file%d.csv", i): []byte(fmt.Sprintf("id,value\n%d,file%d\n", i, i)),
		}
		_, _, err = client.UploadObject(
			ctx, cfg.Workspace, repo.Slug, featureBranch,
			fmt.Sprintf("data/file%d.csv", i), commitFiles,
		)
		if err != nil {
			return fmt.Errorf("failed to upload file %d: %w", i, err)
		}

		_, _, err = client.CreateCommit(ctx, cfg.Workspace, repo.Slug, irmincore.CreateCommitRequest{
			Branch:  featureBranch,
			Message: fmt.Sprintf("Commit %d", i),
		})
		if err != nil {
			return fmt.Errorf("failed to create commit %d: %w", i, err)
		}
	}

	// Squash merge
	mergeCommit, _, err := client.MergeRefs(ctx, cfg.Workspace, repo.Slug, irmincore.MergeRefsRequest{
		BaseRef:     "main",
		CompareRef:  featureBranch,
		Description: "Squash merge feature branch",
		Strategy:    "default",
		Squash:      true,
	})
	if err != nil {
		return fmt.Errorf("failed to squash merge: %w", err)
	}

	if mergeCommit.Hash == "" {
		return fmt.Errorf("squash merge commit hash is empty")
	}

	return nil
}

func testCompareNoDifferences(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	repoName := fmt.Sprintf("e2e-compare-same-test-%d", randomSuffix())
	repo, _, err := client.CreateRepository(ctx, cfg.Workspace, irmincore.CreateRepositoryRequest{
		Name:          repoName,
		Description:   "E2E compare same refs test repository",
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

	// Compare main with itself
	diff, _, err := client.CompareRefs(ctx, cfg.Workspace, repo.Slug, "main", "main")
	if err != nil {
		return fmt.Errorf("failed to compare refs: %w", err)
	}

	// Should have no differences
	if len(diff.Items) != 0 {
		return fmt.Errorf("expected no differences when comparing same ref, got %d", len(diff.Items))
	}

	return nil
}
