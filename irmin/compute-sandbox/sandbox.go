package sandbox

import (
	"context"
	"fmt"
	"irmin-api/bucket"
	"irmin-api/db"
	"irmin-api/utils"
	"log/slog"
	"os"
	"path/filepath"
	"time"
)

// ComputeSandbox is a struct that contains the environment, database, and logger for the compute sandbox.
type ComputeSandbox struct {
	// env is the environment for the compute sandbox.
	env *utils.CoreAPIEnv
	// d is the database for the compute sandbox.
	d *db.Database
	// logger is the logger for the compute sandbox.
	logger *slog.Logger
}

// NewComputeSandbox creates a new ComputeSandbox.
func NewComputeSandbox(env *utils.CoreAPIEnv, d *db.Database, logger *slog.Logger) *ComputeSandbox {
	return &ComputeSandbox{
		env:    env,
		d:      d,
		logger: logger,
	}
}

// ExecuteEditorItem executes the provided executable code in a sandbox environment.
// It downloads the workspace files from the S3 bucket to a temporary directory,
// executes the code using Docker, and returns the execution result.
func (s *ComputeSandbox) ExecuteEditorItem(
	ctx context.Context,
	inputFiles map[string][]byte,
	responsibleUser db.User,
	executablePath, workspaceSlug string,
) (ExecutionResult, error) {
	var result ExecutionResult

	// Initialize bucket client
	bucket, err := bucket.CreateClient(s.env)
	if err != nil {
		return result, err
	}
	defer bucket.Close()

	// Setup workspace files
	workspaceTempDir, err := s.setupWorkspaceFiles(ctx, workspaceSlug, inputFiles)
	if err != nil {
		return result, err
	}

	// Cleanup workspace files after execution
	defer func() {
		if removeAllErr := os.RemoveAll(workspaceTempDir); removeAllErr != nil {
			s.logger.ErrorContext(ctx, "error removing temporary directory", "error", removeAllErr)
		}
		s.logger.InfoContext(ctx, "Temporary directory removed", "workspaceTempDir", workspaceTempDir)
	}()

	// Download workspace files
	if downloadFolderErr := bucket.DownloadFolder(ctx, fmt.Sprintf("editor/%s/", workspaceSlug), workspaceTempDir); downloadFolderErr != nil {
		return result, downloadFolderErr
	}

	// Determine executable type and setup SDK
	executableLanguage := utils.DetermineEditorItemLanguageFromPath(executablePath)
	executableType := ""
	switch *executableLanguage {
	case "js":
		executableType = "node"
	case "go":
		executableType = "go"
		if installGoSDKErr := s.installGoSDK(ctx, workspaceTempDir, filepath.Base(workspaceTempDir)); installGoSDKErr != nil {
			return result, installGoSDKErr
		}
	case "py":
		executableType = "python"
	}

	// Create temporary token
	apiToken, err := s.createTemporaryToken(filepath.Base(workspaceTempDir), responsibleUser)
	if err != nil {
		return result, err
	}
	defer func() {
		if deleteAPITokenErr := s.d.DeleteAPIToken(apiToken.ID); deleteAPITokenErr != nil {
			s.logger.ErrorContext(ctx, "error revoking token after sandbox execution", "error", deleteAPITokenErr)
		}
	}()

	// Execute in Docker
	return s.runInDocker(
		executablePath,
		workspaceTempDir,
		executableType,
		apiToken.Token,
		fmt.Sprintf("%s/api", s.env.URL),
	)
}

// setupWorkspaceFiles handles the creation of temporary directory and writing input files.
func (s *ComputeSandbox) setupWorkspaceFiles(
	ctx context.Context,
	workspaceSlug string,
	inputFiles map[string][]byte,
) (string, error) {
	tempDirName, err := utils.GenerateRandomString()
	if err != nil {
		return "", err
	}

	workspaceTempDir := filepath.Join(os.TempDir(), "irmin-compute-sandbox", workspaceSlug, tempDirName)
	if mkdirAllErr := os.MkdirAll(workspaceTempDir, 0750); mkdirAllErr != nil {
		return "", mkdirAllErr
	}
	s.logger.InfoContext(ctx, "Temporary directory created", "workspaceTempDir", workspaceTempDir)

	// Create and populate _input directory
	inputDir := filepath.Join(workspaceTempDir, "_input")
	if mkdirAllErr := os.MkdirAll(inputDir, 0750); mkdirAllErr != nil {
		return "", fmt.Errorf("failed to create _input directory: %w", mkdirAllErr)
	}

	for filePath, content := range inputFiles {
		fullPath := filepath.Join(inputDir, filePath)
		if mkdirAllErr := os.MkdirAll(filepath.Dir(fullPath), 0750); mkdirAllErr != nil {
			return "", fmt.Errorf("failed to create directory for input file %s: %w", filePath, mkdirAllErr)
		}
		if writeFileErr := os.WriteFile(fullPath, content, 0600); writeFileErr != nil {
			return "", fmt.Errorf("failed to write input file %s: %w", filePath, writeFileErr)
		}
		s.logger.InfoContext(ctx, "Input file written", "filePath", filePath)
	}

	return workspaceTempDir, nil
}

// createTemporaryToken creates a temporary API token for sandbox execution.
func (s *ComputeSandbox) createTemporaryToken(tempDirName string, user db.User) (*db.APIToken, error) {
	token, err := utils.GenerateRandomString()
	if err != nil {
		return nil, err
	}

	apiToken := &db.APIToken{
		Name:      tempDirName,
		Token:     fmt.Sprintf("cred_%s", token),
		ExpiresAt: time.Now().Add(TokenExpiryDuration).UTC(),
		UserID:    user.ID,
		Hidden:    true,
	}
	if createAPITokenErr := s.d.Create(&apiToken).Error; createAPITokenErr != nil {
		return nil, createAPITokenErr
	}

	return apiToken, nil
}
