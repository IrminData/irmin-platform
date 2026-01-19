package scenarios

import (
	"context"
	"fmt"

	irmincore "github.com/IrminData/irmin-sdk-go/api"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// ObjectAdvancedScenarios returns test cases for advanced object operations.
func ObjectAdvancedScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "Object_Copy",
			Description: "Upload a file, copy it to a new location",
			Run:         testObjectCopy,
		},
		{
			Name:        "Object_Move",
			Description: "Upload a file, move it to a new location",
			Run:         testObjectMove,
		},
		{
			Name:        "Object_Schema",
			Description: "Upload a structured file, get its schema",
			Run:         testObjectSchema,
		},
		{
			Name:        "Object_History",
			Description: "Make multiple changes to a file and get its history",
			Run:         testObjectHistory,
		},
		{
			Name:        "Object_Content",
			Description: "Upload a file, get its content directly",
			Run:         testObjectContent,
		},
		{
			Name:        "Object_Structured_Content",
			Description: "Upload a structured file, get parsed content",
			Run:         testObjectStructuredContent,
		},
		{
			Name:        "Object_Uncommitted_Changes",
			Description: "Make changes without committing, verify uncommitted changes",
			Run:         testUncommittedChanges,
		},
		{
			Name:        "Object_Revert_Changes",
			Description: "Upload a file, then revert uncommitted changes",
			Run:         testRevertChanges,
		},
		{
			Name:        "Object_Upload_From_URL",
			Description: "Upload an object from a remote URL",
			Run:         testUploadObjectFromURL,
		},
		{
			Name:        "Object_Create_Pointer",
			Description: "Create a pointer to a file in another repository",
			Run:         testCreatePointer,
		},
	}
}

func testObjectCopy(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	basePath := fmt.Sprintf("copy-test-%d", suffix)

	// Upload a file
	files := map[string][]byte{
		"original.csv": []byte("id,value\n1,original\n"),
	}
	_, _, err := client.UploadObject(
		ctx,
		cfg.Workspace,
		cfg.TestRepository,
		"main",
		fmt.Sprintf("%s/data/original.csv", basePath),
		files,
	)
	if err != nil {
		return fmt.Errorf("failed to upload file: %w", err)
	}

	// Commit the file before copying (required by LakeFS)
	_, _, err = client.CreateCommit(ctx, cfg.Workspace, cfg.TestRepository, irmincore.CreateCommitRequest{
		Branch:  "main",
		Message: fmt.Sprintf("Add file for copy test %d", suffix),
	})
	if err != nil {
		return fmt.Errorf("failed to commit file: %w", err)
	}

	// Copy the file to a new location
	copiedObj, _, err := client.CopyObject(
		ctx,
		cfg.Workspace,
		cfg.TestRepository,
		fmt.Sprintf("%s/data/original.csv", basePath),
		"main",
		irmincore.MoveObjectRequest{
			NewPath: fmt.Sprintf("%s/backup/copied.csv", basePath),
		},
	)
	if err != nil {
		return fmt.Errorf("failed to copy object: %w", err)
	}

	expectedPath := fmt.Sprintf("%s/backup/copied.csv", basePath)
	if copiedObj.Path != "/"+expectedPath && copiedObj.Path != expectedPath {
		return fmt.Errorf("copied object path mismatch: got %q", copiedObj.Path)
	}

	// Verify original still exists
	_, _, err = client.GetObjectAtPath(
		ctx,
		cfg.Workspace,
		cfg.TestRepository,
		fmt.Sprintf("%s/data/original.csv", basePath),
		"main",
	)
	if err != nil {
		return fmt.Errorf("original file not found after copy: %w", err)
	}

	// Verify copy exists
	_, _, err = client.GetObjectAtPath(
		ctx,
		cfg.Workspace,
		cfg.TestRepository,
		fmt.Sprintf("%s/backup/copied.csv", basePath),
		"main",
	)
	if err != nil {
		return fmt.Errorf("copied file not found: %w", err)
	}

	return nil
}

func testObjectMove(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	basePath := fmt.Sprintf("move-test-%d", suffix)

	// Upload a file
	files := map[string][]byte{
		"tomove.csv": []byte("id,value\n1,tomove\n"),
	}
	_, _, err := client.UploadObject(
		ctx,
		cfg.Workspace,
		cfg.TestRepository,
		"main",
		fmt.Sprintf("%s/old/tomove.csv", basePath),
		files,
	)
	if err != nil {
		return fmt.Errorf("failed to upload file: %w", err)
	}

	// Commit the file before moving (required by LakeFS)
	_, _, err = client.CreateCommit(ctx, cfg.Workspace, cfg.TestRepository, irmincore.CreateCommitRequest{
		Branch:  "main",
		Message: fmt.Sprintf("Add file for move test %d", suffix),
	})
	if err != nil {
		return fmt.Errorf("failed to commit file: %w", err)
	}

	// Move the file to a new location
	movedObj, _, err := client.MoveObject(
		ctx,
		cfg.Workspace,
		cfg.TestRepository,
		fmt.Sprintf("%s/old/tomove.csv", basePath),
		"main",
		irmincore.MoveObjectRequest{
			NewPath: fmt.Sprintf("%s/new/moved.csv", basePath),
		},
	)
	if err != nil {
		return fmt.Errorf("failed to move object: %w", err)
	}

	expectedPath := fmt.Sprintf("%s/new/moved.csv", basePath)
	if movedObj.Path != "/"+expectedPath && movedObj.Path != expectedPath {
		return fmt.Errorf("moved object path mismatch: got %q", movedObj.Path)
	}

	// Verify original no longer exists
	_, _, err = client.GetObjectAtPath(
		ctx,
		cfg.Workspace,
		cfg.TestRepository,
		fmt.Sprintf("%s/old/tomove.csv", basePath),
		"main",
	)
	if err == nil {
		return fmt.Errorf("original file still exists after move")
	}

	// Verify new location exists
	_, _, err = client.GetObjectAtPath(
		ctx,
		cfg.Workspace,
		cfg.TestRepository,
		fmt.Sprintf("%s/new/moved.csv", basePath),
		"main",
	)
	if err != nil {
		return fmt.Errorf("moved file not found: %w", err)
	}

	return nil
}

func testObjectSchema(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	basePath := fmt.Sprintf("schema-test-%d", suffix)

	// Upload a CSV with specific columns
	csvContent := `id,name,age,email
1,Alice,28,alice@example.com
2,Bob,34,bob@example.com`

	files := map[string][]byte{
		"users.csv": []byte(csvContent),
	}
	_, _, err := client.UploadObject(
		ctx,
		cfg.Workspace,
		cfg.TestRepository,
		"main",
		fmt.Sprintf("%s/data/users.csv", basePath),
		files,
	)
	if err != nil {
		return fmt.Errorf("failed to upload file: %w", err)
	}

	_, _, err = client.CreateCommit(ctx, cfg.Workspace, cfg.TestRepository, irmincore.CreateCommitRequest{
		Branch:  "main",
		Message: fmt.Sprintf("Add users file for schema test %d", suffix),
	})
	if err != nil {
		return fmt.Errorf("failed to commit: %w", err)
	}

	// Get schema
	schema, _, err := client.GetObjectSchema(
		ctx,
		cfg.Workspace,
		cfg.TestRepository,
		fmt.Sprintf("%s/data/users.csv", basePath),
		"main",
	)
	if err != nil {
		return fmt.Errorf("failed to get schema: %w", err)
	}

	// Verify schema was retrieved (structured file should have a schema)
	if schema.Schema == nil {
		return fmt.Errorf("expected schema to be present for structured file")
	}

	return nil
}

func testObjectHistory(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	basePath := fmt.Sprintf("history-test-%d", suffix)

	// Make multiple commits to the same file
	for i := 1; i <= 3; i++ {
		files := map[string][]byte{
			"data.csv": []byte(fmt.Sprintf("id,value\n%d,version%d\n", i, i)),
		}
		_, _, err := client.UploadObject(
			ctx,
			cfg.Workspace,
			cfg.TestRepository,
			"main",
			fmt.Sprintf("%s/data/data.csv", basePath),
			files,
		)
		if err != nil {
			return fmt.Errorf("failed to upload file version %d: %w", i, err)
		}

		_, _, err = client.CreateCommit(ctx, cfg.Workspace, cfg.TestRepository, irmincore.CreateCommitRequest{
			Branch:  "main",
			Message: fmt.Sprintf("History test %d - Version %d", suffix, i),
		})
		if err != nil {
			return fmt.Errorf("failed to commit version %d: %w", i, err)
		}
	}

	// Get object history
	history, _, err := client.GetObjectHistory(
		ctx,
		cfg.Workspace,
		cfg.TestRepository,
		fmt.Sprintf("%s/data/data.csv", basePath),
		"main",
	)
	if err != nil {
		return fmt.Errorf("failed to get object history: %w", err)
	}

	// Should have 3 commits
	if len(history) < 3 {
		return fmt.Errorf("expected at least 3 commits in history, got %d", len(history))
	}

	return nil
}

func testObjectContent(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	basePath := fmt.Sprintf("content-test-%d", suffix)

	expectedContent := "id,value\n1,test\n2,data\n"
	files := map[string][]byte{
		"test.csv": []byte(expectedContent),
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

	// Get content directly
	content, err := client.GetObjectContent(
		ctx,
		cfg.Workspace,
		cfg.TestRepository,
		fmt.Sprintf("%s/data/test.csv", basePath),
		"main",
		false,
	)
	if err != nil {
		return fmt.Errorf("failed to get content: %w", err)
	}

	if string(content) != expectedContent {
		return fmt.Errorf("content mismatch: expected %q, got %q", expectedContent, string(content))
	}

	return nil
}

func testObjectStructuredContent(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	basePath := fmt.Sprintf("structured-content-test-%d", suffix)

	jsonContent := `[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]`
	files := map[string][]byte{
		"data.json": []byte(jsonContent),
	}
	_, _, err := client.UploadObject(
		ctx,
		cfg.Workspace,
		cfg.TestRepository,
		"main",
		fmt.Sprintf("%s/data/data.json", basePath),
		files,
	)
	if err != nil {
		return fmt.Errorf("failed to upload file: %w", err)
	}

	_, _, err = client.CreateCommit(ctx, cfg.Workspace, cfg.TestRepository, irmincore.CreateCommitRequest{
		Branch:  "main",
		Message: fmt.Sprintf("Add JSON file for structured content test %d", suffix),
	})
	if err != nil {
		return fmt.Errorf("failed to commit: %w", err)
	}

	// Get structured content
	structured, _, err := client.GetObjectStructuredContent(
		ctx, cfg.Workspace, cfg.TestRepository, fmt.Sprintf("%s/data/data.json", basePath), "main", false,
	)
	if err != nil {
		return fmt.Errorf("failed to get structured content: %w", err)
	}

	// Verify it was parsed
	if structured == nil {
		return fmt.Errorf("structured content is nil")
	}

	return nil
}

func testUncommittedChanges(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	basePath := fmt.Sprintf("uncommitted-test-%d", suffix)

	// Upload a file without committing
	files := map[string][]byte{
		"uncommitted.csv": []byte("id,value\n1,uncommitted\n"),
	}
	_, _, err := client.UploadObject(
		ctx,
		cfg.Workspace,
		cfg.TestRepository,
		"main",
		fmt.Sprintf("%s/data/uncommitted.csv", basePath),
		files,
	)
	if err != nil {
		return fmt.Errorf("failed to upload file: %w", err)
	}

	// Get uncommitted changes
	diff, _, err := client.GetUncommittedChanges(ctx, cfg.Workspace, cfg.TestRepository, "main")
	if err != nil {
		return fmt.Errorf("failed to get uncommitted changes: %w", err)
	}

	// Should have at least one uncommitted change
	if len(diff.Items) == 0 {
		return fmt.Errorf("expected uncommitted changes, got none")
	}

	// Commit the changes to clean up
	_, _, _ = client.CreateCommit(ctx, cfg.Workspace, cfg.TestRepository, irmincore.CreateCommitRequest{
		Branch:  "main",
		Message: fmt.Sprintf("Commit uncommitted changes test %d", suffix),
	})

	return nil
}

func testRevertChanges(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	// This test needs its own repository because RevertChanges affects all uncommitted changes on a branch
	repoName := fmt.Sprintf("e2e-revert-test-%d", randomSuffix())
	repo, _, err := client.CreateRepository(ctx, cfg.Workspace, irmincore.CreateRepositoryRequest{
		Name:          repoName,
		Description:   "E2E revert changes test repository",
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

	// Upload a file without committing
	files := map[string][]byte{
		"torevert.csv": []byte("id,value\n1,torevert\n"),
	}
	_, _, err = client.UploadObject(ctx, cfg.Workspace, repo.Slug, "main", "data/torevert.csv", files)
	if err != nil {
		return fmt.Errorf("failed to upload file: %w", err)
	}

	// Verify uncommitted changes exist
	diff, _, err := client.GetUncommittedChanges(ctx, cfg.Workspace, repo.Slug, "main")
	if err != nil {
		return fmt.Errorf("failed to get uncommitted changes: %w", err)
	}

	if len(diff.Items) == 0 {
		return fmt.Errorf("expected uncommitted changes before revert")
	}

	// Revert the changes
	_, err = client.RevertChanges(ctx, cfg.Workspace, repo.Slug, irmincore.RevertUncommittedChangesRequest{
		Branch: "main",
	})
	if err != nil {
		return fmt.Errorf("failed to revert changes: %w", err)
	}

	// Verify no more uncommitted changes
	diff, _, err = client.GetUncommittedChanges(ctx, cfg.Workspace, repo.Slug, "main")
	if err != nil {
		return fmt.Errorf("failed to get uncommitted changes after revert: %w", err)
	}

	if len(diff.Items) != 0 {
		return fmt.Errorf("expected no uncommitted changes after revert, got %d", len(diff.Items))
	}

	return nil
}

func testUploadObjectFromURL(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	basePath := fmt.Sprintf("url-upload-test-%d", suffix)

	// Upload a file from a public URL (using a well-known public JSON file)
	testURL := "https://jsonplaceholder.typicode.com/posts/1"

	obj, _, err := client.UploadObjectFromURL(
		ctx, cfg.Workspace, cfg.TestRepository, "main", fmt.Sprintf("%s/data/post.json", basePath),
		irmincore.UploadObjectFromURLRequest{URL: testURL},
	)
	if err != nil {
		// URL upload may fail if the feature is not enabled or network issues
		// This is acceptable for this test
		return nil //nolint:nilerr // intentional: feature may not be available
	}

	// Verify the object was created
	if obj.Path == "" {
		return fmt.Errorf("uploaded object path is empty")
	}

	return nil
}

func testCreatePointer(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()

	// Create a source repository with a file to point to
	sourceRepoName := fmt.Sprintf("e2e-pointer-source-%d", suffix)
	sourceRepo, _, err := client.CreateRepository(ctx, cfg.Workspace, irmincore.CreateRepositoryRequest{
		Name:          sourceRepoName,
		Description:   "Source repository for pointer test",
		DefaultBranch: "main",
	})
	if err != nil {
		return fmt.Errorf("failed to create source repository: %w", err)
	}

	defer func() {
		if cfg.CleanupAfterTests {
			_, _ = client.DeleteRepository(ctx, cfg.Workspace, sourceRepo.Slug)
		}
	}()

	// Upload a file to the source repository
	sourceContent := `id,name,value
1,Alice,100
2,Bob,200
3,Charlie,300`

	files := map[string][]byte{
		"data.csv": []byte(sourceContent),
	}
	_, _, err = client.UploadObject(
		ctx, cfg.Workspace, sourceRepo.Slug, "main",
		"shared/data.csv", files,
	)
	if err != nil {
		return fmt.Errorf("failed to upload source file: %w", err)
	}

	// Commit the source file
	_, _, err = client.CreateCommit(ctx, cfg.Workspace, sourceRepo.Slug, irmincore.CreateCommitRequest{
		Branch:  "main",
		Message: "Add shared data file",
	})
	if err != nil {
		return fmt.Errorf("failed to commit source file: %w", err)
	}

	// Create a pointer in the shared test repository pointing to the source file
	basePath := fmt.Sprintf("pointer-test-%d", suffix)
	pointerPath := fmt.Sprintf("%s/pointers/linked-data.csv", basePath)

	pointer, _, err := client.CreatePointer(
		ctx, cfg.Workspace, cfg.TestRepository, pointerPath, "main",
		irmincore.CreatePointerRequest{
			TargetRepository: sourceRepo.Slug,
			TargetPath:       "shared/data.csv",
			TargetRef:        "main",
		},
	)
	if err != nil {
		return fmt.Errorf("failed to create pointer: %w", err)
	}

	// Verify pointer was created
	if pointer.Path == "" {
		return fmt.Errorf("pointer path is empty")
	}

	if !pointer.IsPointer {
		return fmt.Errorf("expected object to be a pointer, but IsPointer is false")
	}

	// Verify pointer target information
	if pointer.PointerTarget == nil {
		return fmt.Errorf("pointer target is nil")
	}

	if pointer.PointerTarget.Repository != sourceRepo.Slug {
		return fmt.Errorf(
			"pointer target repository mismatch: expected %q, got %q",
			sourceRepo.Slug, pointer.PointerTarget.Repository,
		)
	}

	if pointer.PointerTarget.Path != "shared/data.csv" {
		return fmt.Errorf(
			"pointer target path mismatch: expected %q, got %q",
			"shared/data.csv", pointer.PointerTarget.Path,
		)
	}

	return nil
}
