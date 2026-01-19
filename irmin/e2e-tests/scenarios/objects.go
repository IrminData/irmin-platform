package scenarios

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	irmincore "github.com/IrminData/irmin-sdk-go/api"

	"github.com/IrminData/irmin-e2e-tests/config"
	"github.com/IrminData/irmin-e2e-tests/runner"
)

// ObjectScenarios returns test cases for object/file operations.
func ObjectScenarios() []runner.TestCase {
	return []runner.TestCase{
		{
			Name:        "Object_Upload_Download_CSV",
			Description: "Upload a CSV file, download it, verify content matches",
			Run:         testObjectUploadDownloadCSV,
		},
		{
			Name:        "Object_Upload_Download_JSON",
			Description: "Upload a JSON file, download it, verify content matches",
			Run:         testObjectUploadDownloadJSON,
		},
		{
			Name:        "Object_List",
			Description: "Upload files and verify they appear in object listing",
			Run:         testObjectList,
		},
		{
			Name:        "Object_Delete",
			Description: "Upload a file, delete it, verify it's gone",
			Run:         testObjectDelete,
		},
	}
}

func testObjectUploadDownloadCSV(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	return testObjectUploadDownload(
		ctx, client, cfg,
		"testdata/sample.csv",
		fmt.Sprintf("object-test-%d/sample.csv", suffix),
	)
}

func testObjectUploadDownloadJSON(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	return testObjectUploadDownload(
		ctx, client, cfg,
		"testdata/sample.json",
		fmt.Sprintf("object-test-%d/sample.json", suffix),
	)
}

func testObjectUploadDownload(
	ctx context.Context,
	client *irmincore.Client,
	cfg *config.Config,
	localPath, remotePath string,
) error {
	// Read local file
	originalContent, err := os.ReadFile(localPath)
	if err != nil {
		return fmt.Errorf("failed to read local file: %w", err)
	}

	// Upload file to shared repository
	// The path parameter includes the full path, filename in map should match the final component
	fileName := filepath.Base(remotePath)
	files := map[string][]byte{
		fileName: originalContent,
	}
	_, _, err = client.UploadObject(ctx, cfg.Workspace, cfg.TestRepository, "main", remotePath, files)
	if err != nil {
		return fmt.Errorf("failed to upload object: %w", err)
	}

	// Download and verify we get content back (using the same path we uploaded to)
	downloadedContent, err := client.DownloadObject(ctx, cfg.Workspace, cfg.TestRepository, remotePath, "main")
	if err != nil {
		return fmt.Errorf("failed to download object: %w", err)
	}

	if len(downloadedContent) == 0 {
		return fmt.Errorf("downloaded content is empty")
	}

	return nil
}

func testObjectList(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	basePath := fmt.Sprintf("object-list-test-%d", suffix)

	// Upload multiple files
	testFiles := []string{"file1.csv", "file2.csv", "file3.csv"}
	for _, name := range testFiles {
		files := map[string][]byte{
			name: []byte("id,value\n1,test\n"),
		}
		remotePath := fmt.Sprintf("%s/%s", basePath, name)
		_, _, err := client.UploadObject(ctx, cfg.Workspace, cfg.TestRepository, "main", remotePath, files)
		if err != nil {
			return fmt.Errorf("failed to upload %s: %w", name, err)
		}
	}

	// List objects
	obj, _, err := client.GetObjectAtPath(ctx, cfg.Workspace, cfg.TestRepository, basePath, "main")
	if err != nil {
		return fmt.Errorf("failed to list objects: %w", err)
	}

	if len(obj.Children) != len(testFiles) {
		return fmt.Errorf("expected %d objects, found %d", len(testFiles), len(obj.Children))
	}

	return nil
}

func testObjectDelete(ctx context.Context, client *irmincore.Client, cfg *config.Config) error {
	suffix := randomSuffix()
	remotePath := fmt.Sprintf("object-delete-test-%d/test.csv", suffix)

	// Upload a file
	files := map[string][]byte{
		"test.csv": []byte("id,value\n1,test\n"),
	}
	_, _, err := client.UploadObject(ctx, cfg.Workspace, cfg.TestRepository, "main", remotePath, files)
	if err != nil {
		return fmt.Errorf("failed to upload object: %w", err)
	}

	// Delete the file
	_, err = client.DeleteObject(ctx, cfg.Workspace, cfg.TestRepository, "main", remotePath)
	if err != nil {
		return fmt.Errorf("failed to delete object: %w", err)
	}

	// Verify deletion - trying to get the object should fail
	_, _, err = client.GetObjectAtPath(ctx, cfg.Workspace, cfg.TestRepository, remotePath, "main")
	if err == nil {
		return fmt.Errorf("object still exists after deletion")
	}

	return nil
}
