package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-sdk-go/api"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// GitTagScenarios returns test cases for git tag operations.
func GitTagScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "GitTag_Create_List_Delete",
			Description: "Create a git tag, verify it in list, delete it",
			Run:         testGitTagLifecycle,
		},
		{
			Name:        "GitTag_Create_From_Commit",
			Description: "Create a git tag from a specific commit",
			Run:         testGitTagFromCommit,
		},
		{
			Name:        "GitTag_Get_Details",
			Description: "Create a git tag and get its details",
			Run:         testGitTagDetails,
		},
	}
}

func testGitTagLifecycle(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()

	// Create a git tag with unique name
	tagName := fmt.Sprintf("v1.0.0-test-%d", suffix)
	_, _, err := client.CreateTag(ctx, cfg.Workspace, cfg.TestRepository, irmincore.CreateRepositoryTagRequest{
		Name: tagName,
		Ref:  "main",
	})
	if err != nil {
		return fmt.Errorf("failed to create git tag: %w", err)
	}

	// List git tags and verify
	tags, _, err := client.ListTags(ctx, cfg.Workspace, cfg.TestRepository)
	if err != nil {
		return fmt.Errorf("failed to list git tags: %w", err)
	}

	found := false
	for _, t := range tags {
		if t.Name == tagName {
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("created git tag not found in list")
	}

	// Delete the tag
	_, err = client.DeleteTag(ctx, cfg.Workspace, cfg.TestRepository, tagName)
	if err != nil {
		return fmt.Errorf("failed to delete git tag: %w", err)
	}

	// Verify deletion
	tags, _, err = client.ListTags(ctx, cfg.Workspace, cfg.TestRepository)
	if err != nil {
		return fmt.Errorf("failed to list git tags after deletion: %w", err)
	}

	for _, t := range tags {
		if t.Name == tagName {
			return fmt.Errorf("git tag still exists after deletion")
		}
	}

	return nil
}

func testGitTagFromCommit(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	basePath := fmt.Sprintf("git-tag-commit-test-%d", suffix)

	// Upload a file and create a commit
	files := map[string][]byte{
		"test.csv": []byte("id,value\n1,test\n"),
	}
	_, _, err := client.UploadObject(
		ctx,
		cfg.Workspace,
		cfg.TestRepository,
		"main",
		fmt.Sprintf("%s/data/test.csv", basePath),
		files,
	)
	if err != nil {
		return fmt.Errorf("failed to upload file: %w", err)
	}

	commit, _, err := client.CreateCommit(ctx, cfg.Workspace, cfg.TestRepository, irmincore.CreateCommitRequest{
		Branch:  "main",
		Message: fmt.Sprintf("Commit for tag test %d", suffix),
	})
	if err != nil {
		return fmt.Errorf("failed to create commit: %w", err)
	}

	// Create git tag from commit hash
	tagName := fmt.Sprintf("v1.0.0-commit-%d", suffix)
	createdTag, _, err := client.CreateTag(ctx, cfg.Workspace, cfg.TestRepository, irmincore.CreateRepositoryTagRequest{
		Name: tagName,
		Ref:  commit.Hash,
	})
	if err != nil {
		return fmt.Errorf("failed to create git tag from commit: %w", err)
	}

	if createdTag.Ref != commit.Hash {
		return fmt.Errorf("tag ref mismatch: expected %s, got %s", commit.Hash, createdTag.Ref)
	}

	// Cleanup: delete the tag
	_, _ = client.DeleteTag(ctx, cfg.Workspace, cfg.TestRepository, tagName)

	return nil
}

func testGitTagDetails(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()

	// Create a git tag with unique name
	tagName := fmt.Sprintf("v2.0.0-details-%d", suffix)
	_, _, err := client.CreateTag(ctx, cfg.Workspace, cfg.TestRepository, irmincore.CreateRepositoryTagRequest{
		Name: tagName,
		Ref:  "main",
	})
	if err != nil {
		return fmt.Errorf("failed to create git tag: %w", err)
	}

	// Get tag details
	fetchedTag, _, err := client.GetTag(ctx, cfg.Workspace, cfg.TestRepository, tagName)
	if err != nil {
		return fmt.Errorf("failed to get git tag: %w", err)
	}

	if fetchedTag.Name != tagName {
		return fmt.Errorf("tag name mismatch: expected %q, got %q", tagName, fetchedTag.Name)
	}

	if fetchedTag.Ref == "" {
		return fmt.Errorf("tag ref is empty")
	}

	// Cleanup: delete the tag
	_, _ = client.DeleteTag(ctx, cfg.Workspace, cfg.TestRepository, tagName)

	return nil
}
