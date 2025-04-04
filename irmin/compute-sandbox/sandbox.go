package sandbox

import (
	"context"
	"fmt"
	"irmin-api/bucket"
	"irmin-api/utils"
	"log"
	"os"
	"path/filepath"
)

// ExecuteEditorItem executes the provided executable code in a sandbox environment.
// It downloads the workspace files from the S3 bucket to a temporary directory,
// executes the code using Docker, and returns the execution result.
// Example usage:
//
//	func main() {
//		ctx := context.Background()
//		result, err := sandbox.ExecuteEditorItem(ctx, "hello-world.js", "tims-office")
//		if err != nil {
//			fmt.Printf("Error: %v\n", err)
//		}
//		resultJson, err := json.MarshalIndent(result, "", "  ")
//		if err != nil {
//			fmt.Printf("Error marshalling result to JSON: %v\n", err)
//			return
//		}
//		fmt.Printf("Execution result:\n%s\n", resultJson)
//	}
func ExecuteEditorItem(ctx context.Context, executablePath, workspaceSlug string) (*ExecutionResult, error) {
	var result ExecutionResult

	// Initialize the bucket client
	bucket, err := bucket.CreateBucketClient()
	if err != nil {
		return nil, err
	}
	defer bucket.Close()

	// Generate a random temporary folder name (assuming GenerateRandomString exists)
	tempDirName, err := utils.GenerateRandomString()
	if err != nil {
		return nil, err
	}

	// Use the system's temporary directory instead of /sandbox.
	workspaceTempDir := filepath.Join(os.TempDir(), "irmin-compute-sandbox", workspaceSlug, tempDirName)

	// Create the directory and any necessary parents.
	err = os.MkdirAll(workspaceTempDir, 0755) // use 0755 for directory permissions
	if err != nil {
		return nil, err
	}
	log.Printf("Temporary directory created: %s\n", workspaceTempDir)

	// Download the workspace files into the writable directory.
	err = bucket.DownloadFolder(ctx, fmt.Sprintf("editor/%s/", workspaceSlug), workspaceTempDir)
	if err != nil {
		return nil, err
	}

	// Delete the workspace files after execution
	defer func() {
		err := os.RemoveAll(workspaceTempDir)
		if err != nil {
			log.Printf("error removing temporary directory: %v\n", err)
		}
		log.Printf("Temporary directory removed: %s\n", workspaceTempDir)
	}()

	// Determine the type of executable based on the file extension
	executableLanguage := utils.ParseEditorItemLanguageFromPath(executablePath)
	executableType := ""
	switch *executableLanguage {
	case "js":
		executableType = "node"
	case "go":
		executableType = "go"
	case "py":
		executableType = "python"
	}
	// Execute the code in the sandbox
	result, err = runInDocker(executablePath, workspaceTempDir, executableType)
	if err != nil {
		return nil, err
	}

	return &result, nil
}
