package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// BranchScenarios returns test cases for branch operations.
func BranchScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "Branch_Create_List_Delete",
			Description: "Create a branch, verify it in list, delete it",
			Run:         testBranchLifecycle,
		},
		{
			Name:        "Branch_Create_From_Commit",
			Description: "Create a branch from a specific commit",
			Run:         testBranchFromCommit,
		},
	}
}

func testBranchLifecycle(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	// LakeFS branch names can only contain letters, digits, underscores, and dashes (no slashes)
	branchName := fmt.Sprintf("feature-test-branch-%d", suffix)

	// Create a branch
	_, _, err := client.CreateBranch(ctx, cfg.Workspace, cfg.TestRepository, irmincore.CreateBranchRequest{
		Name: branchName,
		From: "main",
	})
	if err != nil {
		return fmt.Errorf("failed to create branch: %w", err)
	}

	// List branches and verify
	branches, _, err := client.ListBranches(ctx, cfg.Workspace, cfg.TestRepository)
	if err != nil {
		return fmt.Errorf("failed to list branches: %w", err)
	}

	found := false
	for _, b := range branches {
		if b.Name == branchName {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("created branch not found in list")
	}

	// Delete the branch
	_, err = client.DeleteBranch(ctx, cfg.Workspace, cfg.TestRepository, branchName)
	if err != nil {
		return fmt.Errorf("failed to delete branch: %w", err)
	}

	// Verify deletion
	branches, _, err = client.ListBranches(ctx, cfg.Workspace, cfg.TestRepository)
	if err != nil {
		return fmt.Errorf("failed to list branches after deletion: %w", err)
	}

	for _, b := range branches {
		if b.Name == branchName {
			return fmt.Errorf("branch still exists after deletion")
		}
	}

	return nil
}

func testBranchFromCommit(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	basePath := fmt.Sprintf("branch-commit-test-%d", suffix)

	// Upload a file to create some history
	files := map[string][]byte{
		"test.csv": []byte("id,value\n1,initial\n"),
	}
	_, _, err := client.UploadObject(
		ctx, cfg.Workspace, cfg.TestRepository, "main",
		fmt.Sprintf("%s/test.csv", basePath), files,
	)
	if err != nil {
		return fmt.Errorf("failed to upload initial file: %w", err)
	}

	// Create a commit
	commit, _, err := client.CreateCommit(ctx, cfg.Workspace, cfg.TestRepository, irmincore.CreateCommitRequest{
		Branch:  "main",
		Message: fmt.Sprintf("Commit for branch test %d", suffix),
	})
	if err != nil {
		return fmt.Errorf("failed to create commit: %w", err)
	}

	// Create branch from the commit
	// LakeFS branch names can only contain letters, digits, underscores, and dashes (no slashes)
	branchName := fmt.Sprintf("feature-from-commit-%d", suffix)
	_, _, err = client.CreateBranch(ctx, cfg.Workspace, cfg.TestRepository, irmincore.CreateBranchRequest{
		Name: branchName,
		From: commit.Hash,
	})
	if err != nil {
		return fmt.Errorf("failed to create branch from commit: %w", err)
	}

	// Verify branch exists
	branch, _, err := client.GetBranch(ctx, cfg.Workspace, cfg.TestRepository, branchName)
	if err != nil {
		return fmt.Errorf("failed to get branch: %w", err)
	}

	if branch.Name != branchName {
		return fmt.Errorf("branch name mismatch: expected %s, got %s", branchName, branch.Name)
	}

	// Clean up the branch
	_, _ = client.DeleteBranch(ctx, cfg.Workspace, cfg.TestRepository, branchName)

	return nil
}
