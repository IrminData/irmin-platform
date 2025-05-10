package sandbox

import (
	"context"
	"fmt"
	"irmin-api/bucket"
	"irmin-api/db"
	"irmin-api/utils"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

// installGoSDK retrieves the Go SDK by running "go get" in the destination directory.
// Returns an error if the installation fails.
func installGoSDK(destDir string, projectName string) error {
	// Prepare the module initialization command.
	cmd := exec.Command("go", "mod", "init", projectName)
	cmd.Dir = destDir // Set the working directory to the destination directory.
	cmd.Run()
	// Prepare the SDK installation command.
	cmd = exec.Command(
		"go",
		"get",
		"github.com/IrminData/irmin-sdk-go",
		"github.com/IrminData/irmin-sdk-go/core-api",
		"github.com/IrminData/irmin-sdk-go/utils",
	)
	cmd.Dir = destDir // Set the working directory to the destination directory.
	// Run the command and capture combined output.
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to get go sdk: %w, output: %s", err, output)
	}
	log.Printf("Go SDK installed successfully in %s\n", destDir)
	return nil
}

// ExecuteEditorItem executes the provided executable code in a sandbox environment.
// It downloads the workspace files from the S3 bucket to a temporary directory,
// executes the code using Docker, and returns the execution result.
func ExecuteEditorItem(
	ctx context.Context,
	inputFiles map[string][]byte, // key is the file path, value is the file content
	responsibleUser db.User,
	executablePath, workspaceSlug string,
) (ExecutionResult, error) {
	var result ExecutionResult

	// Get the API URL from the environment variable.
	env, err := utils.LoadEnv()
	if err != nil {
		return result, err
	}
	apiBaseURL := fmt.Sprintf("%s/api", env.URL)

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

	// Create _input directory for input files
	inputDir := filepath.Join(workspaceTempDir, "_input")
	err = os.MkdirAll(inputDir, 0755)
	if err != nil {
		return result, fmt.Errorf("failed to create _input directory: %w", err)
	}

	// Write input files to the _input directory
	for filePath, content := range inputFiles {
		fullPath := filepath.Join(inputDir, filePath)

		// Create parent directories if they don't exist
		err := os.MkdirAll(filepath.Dir(fullPath), 0755)
		if err != nil {
			return result, fmt.Errorf("failed to create directory for input file %s: %w", filePath, err)
		}

		// Write the file content
		err = os.WriteFile(fullPath, content, 0644)
		if err != nil {
			return result, fmt.Errorf("failed to write input file %s: %w", filePath, err)
		}
		log.Printf("Input file written: _input/%s\n", filePath)
	}

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

	// Generate a random 64-character token.
	token, err := utils.GenerateRandomString()
	if err != nil {
		return result, err
	}

	// Create a temporary token for the user
	apiToken, err := db.CreateAPIToken(&db.APIToken{
		Name:      tempDirName,
		Token:     fmt.Sprintf("cred_%s", token),
		ExpiresAt: time.Now().Add(60 * time.Minute).UTC(), // 1 hour expiry
		UserID:    responsibleUser.ID,
		Hidden:    true,
	})
	if err != nil {
		return result, err
	}

	// Revoke the token after the execution
	defer func() {
		err := db.DeleteAPIToken(apiToken.ID)
		if err != nil {
			log.Printf("error revoking token after sandbox execution: %v\n", err)
		}
	}()

	// Execute the code in the sandbox
	result, err = runInDocker(executablePath, workspaceTempDir, executableType, apiToken.Token, apiBaseURL)
	if err != nil {
		return result, err
	}

	return result, nil
}
