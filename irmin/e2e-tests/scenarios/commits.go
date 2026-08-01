package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// CommitScenarios returns test cases for commit operations.
func CommitScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "Commit_Create_List",
			Description: "Create commits and verify commit history",
			Run:         testCommitHistory,
		},
		{
			Name:        "Commit_Get_Details",
			Description: "Get details of a specific commit",
			Run:         testCommitDetails,
		},
	}
}

func testCommitHistory(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	basePath := fmt.Sprintf("commit-history-test-%d", suffix)

	// Create multiple commits
	commitMessages := []string{
		fmt.Sprintf("First commit %d", suffix),
		fmt.Sprintf("Second commit %d", suffix),
		fmt.Sprintf("Third commit %d", suffix),
	}

	for i, msg := range commitMessages {
		// Upload a file change
		files := map[string][]byte{
			"test.csv": []byte(fmt.Sprintf("id,value\n%d,commit-%d\n", i+1, i+1)),
		}
		_, _, err := client.UploadObject(
			ctx, cfg.Workspace, cfg.TestRepository, "main",
			fmt.Sprintf("%s/test.csv", basePath), files,
		)
		if err != nil {
			return fmt.Errorf("failed to upload file for commit %d: %w", i+1, err)
		}

		// Create commit
		_, _, err = client.CreateCommit(ctx, cfg.Workspace, cfg.TestRepository, irmincore.CreateCommitRequest{
			Branch:  "main",
			Message: msg,
		})
		if err != nil {
			return fmt.Errorf("failed to create commit %d: %w", i+1, err)
		}
	}

	// List commits and verify count
	commits, _, err := client.ListCommits(ctx, cfg.Workspace, cfg.TestRepository, "main", "", 100)
	if err != nil {
		return fmt.Errorf("failed to list commits: %w", err)
	}

	// Should have at least our 3 commits (plus any initial commits)
	if len(commits) < len(commitMessages) {
		return fmt.Errorf("expected at least %d commits, got %d", len(commitMessages), len(commits))
	}

	return nil
}

func testCommitDetails(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	basePath := fmt.Sprintf("commit-details-test-%d", suffix)

	// Upload a file and create a commit
	files := map[string][]byte{
		"test.csv": []byte("id,value\n1,test\n"),
	}
	_, _, err := client.UploadObject(
		ctx, cfg.Workspace, cfg.TestRepository, "main",
		fmt.Sprintf("%s/test.csv", basePath), files,
	)
	if err != nil {
		return fmt.Errorf("failed to upload file: %w", err)
	}

	commitMessage := fmt.Sprintf("Test commit %d with specific message", suffix)
	commit, _, err := client.CreateCommit(ctx, cfg.Workspace, cfg.TestRepository, irmincore.CreateCommitRequest{
		Branch:  "main",
		Message: commitMessage,
	})
	if err != nil {
		return fmt.Errorf("failed to create commit: %w", err)
	}

	// Get commit details
	fetchedCommit, _, err := client.GetCommit(ctx, cfg.Workspace, cfg.TestRepository, commit.Hash)
	if err != nil {
		return fmt.Errorf("failed to get commit: %w", err)
	}

	if fetchedCommit.Message != commitMessage {
		return fmt.Errorf("commit message mismatch: expected %q, got %q", commitMessage, fetchedCommit.Message)
	}

	if fetchedCommit.Hash != commit.Hash {
		return fmt.Errorf("commit hash mismatch: expected %q, got %q", commit.Hash, fetchedCommit.Hash)
	}

	return nil
}
