package sandbox

import (
	"context"
	"fmt"
	"irmin-api/bucket"
	"irmin-api/utils"
	"log"
	"os"
	"os/exec"
	"path/filepath"
)

// installGoSDK retrieves the Go SDK by running "go get" in the destination directory.
// Returns an error if the installation fails.
func installGoSDK(destDir string, projectName string) error {
	// Prepare the module initialization command.
	cmd := exec.Command("go", "mod", "init", projectName)
	cmd.Dir = destDir // Set the working directory to the destination directory.
	cmd.Run()
	// Prepare the SDK installation command.
	cmd = exec.Command("go", "get", "github.com/IrminData/irmin-sdk-go", "github.com/IrminData/irmin-sdk-go/core-api", "github.com/IrminData/irmin-sdk-go/utils")
	cmd.Dir = destDir // Set the working directory to the destination directory.
	// Run the command and capture combined output.
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to get go sdk: %v, output: %s", err, output)
	}
	log.Printf("Go SDK installed successfully in %s\n", destDir)
	return nil
}

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
func ExecuteEditorItem(ctx context.Context, executablePath, workspaceSlug string) (ExecutionResult, error) {
	var result ExecutionResult

	// Initialize the bucket client
	bucket, err := bucket.CreateBucketClient()
	if err != nil {
		return result, err
	}
	defer bucket.Close()

	// Generate a random temporary folder name (assuming GenerateRandomString exists)
	tempDirName, err := utils.GenerateRandomString()
	if err != nil {
		return result, err
	}

	// Use the system's temporary directory instead of /sandbox.
	workspaceTempDir := filepath.Join(os.TempDir(), "irmin-compute-sandbox", workspaceSlug, tempDirName)

	// Create the directory and any necessary parents.
	err = os.MkdirAll(workspaceTempDir, 0755) // use 0755 for directory permissions
	if err != nil {
		return result, err
	}
	log.Printf("Temporary directory created: %s\n", workspaceTempDir)

	// Download the workspace files into the writable directory.
	err = bucket.DownloadFolder(ctx, fmt.Sprintf("editor/%s/", workspaceSlug), workspaceTempDir)
	if err != nil {
		return result, err
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
		// TODO: Install the JavaScript SDK in the temp directory, when such SDK exists.
	case "go":
		executableType = "go"
		// Install the Go SDK in the temp directory.
		err := installGoSDK(workspaceTempDir, tempDirName)
		if err != nil {
			return result, err
		}
	case "py":
		executableType = "python"
		// TODO: Install the Python SDK in the temp directory, when such SDK exists.
	}
	// Execute the code in the sandbox
	result, err = runInDocker(executablePath, workspaceTempDir, executableType, "api-key", "https://api.irmin.co/api")
	if err != nil {
		return result, err
	}

	return result, nil
}
