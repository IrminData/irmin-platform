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
	"strings"
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

	// Check for context cancellation before starting
	if ctx.Err() != nil {
		return result, ctx.Err()
	}

	// Initialize bucket client
	bucket, err := bucket.CreateClient(s.env)
	if err != nil {
		return result, err
	}
	defer bucket.Close()

	// Setup workspace files with context
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

	// Check for context cancellation before downloading
	if ctx.Err() != nil {
		return result, ctx.Err()
	}

	// Download workspace files with timeout
	downloadCtx, cancelDownload := context.WithTimeout(ctx, FileDownloadTimeout)
	defer cancelDownload()

	// Format the workspace's base path prefix
	editorPathPrefix := utils.ConstructEditorStorageNamespace(s.env.IrminS3Bucket, workspaceSlug)
	editorPathPrefix = strings.TrimPrefix(editorPathPrefix, "s3://")
	if !strings.HasSuffix(editorPathPrefix, "/") {
		editorPathPrefix += "/"
	}

	if downloadFolderErr := bucket.DownloadFolder(downloadCtx, editorPathPrefix, workspaceTempDir); downloadFolderErr != nil {
		return result, downloadFolderErr
	}

	// Check for context cancellation before determining executable type
	if ctx.Err() != nil {
		return result, ctx.Err()
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

	// Check for context cancellation before creating token
	if ctx.Err() != nil {
		return result, ctx.Err()
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

	// Execute in Docker with context
	return s.runInDocker(
		ctx,
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
	// Check for context cancellation before starting
	if ctx.Err() != nil {
		return "", ctx.Err()
	}

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

	// Create a channel to signal completion of file operations
	done := make(chan error, 1)

	go func() {
		// Write input files with context checking
		for filePath, content := range inputFiles {
			// Check for context cancellation before each file write
			if ctx.Err() != nil {
				done <- ctx.Err()
				return
			}

			fullPath := filepath.Join(inputDir, filePath)
			if mkdirAllErr := os.MkdirAll(filepath.Dir(fullPath), 0750); mkdirAllErr != nil {
				done <- fmt.Errorf("failed to create directory for input file %s: %w", filePath, mkdirAllErr)
				return
			}

			// Write file - since os.WriteFile is not context-aware, we do the context check before
			if writeFileErr := os.WriteFile(fullPath, content, 0600); writeFileErr != nil {
				done <- fmt.Errorf("failed to write input file %s: %w", filePath, writeFileErr)
				return
			}
			s.logger.InfoContext(ctx, "Input file written", "filePath", filePath)
		}
		done <- nil
	}()

	// Wait for completion or context cancellation with timeout
	select {
	case doneChanErr := <-done:
		if doneChanErr != nil {
			return workspaceTempDir, doneChanErr
		}
	case <-ctx.Done():
		return workspaceTempDir, ctx.Err()
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
