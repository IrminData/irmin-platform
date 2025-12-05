package sandbox

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// ErrScriptAlreadyRunning is returned when attempting to execute a script
// that is already being executed by another session.
var ErrScriptAlreadyRunning = errors.New("script is already being executed")

// ComputeSandbox is a struct that contains the environment, database, and logger for the compute sandbox.
type ComputeSandbox struct {
	// env is the environment for the compute sandbox.
	env *utils.CoreAPIEnv
	// d is the database for the compute sandbox.
	d *db.Database
	// logger is the logger for the compute sandbox.
	logger *slog.Logger
	// executor is the script executor.
	executor *executor
}

// NewComputeSandbox creates a new ComputeSandbox.
func NewComputeSandbox(env *utils.CoreAPIEnv, d *db.Database, logger *slog.Logger) *ComputeSandbox {
	s := &ComputeSandbox{
		env:    env,
		d:      d,
		logger: logger,
	}
	s.executor = newExecutor(s)
	return s
}

// ExecutedStoredScript executes the provided stored script.
// It creates a temporary directory, writes the script content to a file,
// executes the code, and returns the execution result.
//
//nolint:funlen,gocognit // Complexity is acceptable for script execution with proper error handling and locking
func (s *ComputeSandbox) ExecutedStoredScript(
	ctx context.Context,
	inputFiles map[string][]byte,
	responsibleUser db.User,
	script *db.StoredScript,
) (ExecutionResult, error) {
	var result ExecutionResult

	// Check for context cancellation before starting
	if ctx.Err() != nil {
		return result, ctx.Err()
	}

	// Acquire a dedicated connection for advisory lock
	// PostgreSQL advisory locks are session-scoped and must use the same connection
	lockConn, err := s.d.GetPgxConn(ctx)
	if err != nil {
		return result, fmt.Errorf("failed to acquire connection for execution lock: %w", err)
	}

	// Acquire lock to prevent concurrent execution of the same script
	lockKey := s.buildScriptLockKey(script.ID)
	locked, lockErr := db.TryLockKeyConn(ctx, lockConn, lockKey)
	if lockErr != nil {
		lockConn.Release()
		return result, fmt.Errorf("failed to acquire execution lock: %w", lockErr)
	}
	if !locked {
		lockConn.Release()
		return result, ErrScriptAlreadyRunning
	}

	// Ensure lock and connection are released after execution
	// Use context.Background() for unlock to ensure it executes even if ctx is cancelled
	defer func() {
		unlockCtx := context.Background()
		if unlockErr := db.UnlockKeyConn(unlockCtx, lockConn, lockKey); unlockErr != nil {
			s.logger.ErrorContext(unlockCtx, "error releasing execution lock", "error", unlockErr, "lockKey", lockKey)
		}
		lockConn.Release()
	}()

	// Setup workspace files with context
	workspaceTempDir, err := s.setupWorkspaceFiles(ctx, script.ID, inputFiles)

	// Cleanup workspace files after execution
	// Use context.Background() to ensure cleanup executes even if ctx is cancelled
	// Register defer immediately after setupWorkspaceFiles so it runs even if setup fails
	defer func() {
		// Skip cleanup if workspaceTempDir is empty (setup failed before directory creation)
		if workspaceTempDir == "" {
			return
		}
		cleanupCtx := context.Background()
		if removeAllErr := os.RemoveAll(workspaceTempDir); removeAllErr != nil {
			s.logger.ErrorContext(cleanupCtx, "error removing temporary directory", "error", removeAllErr)
		}
		s.logger.InfoContext(cleanupCtx, "Temporary directory removed", "workspaceTempDir", workspaceTempDir)
	}()

	if err != nil {
		return result, err
	}

	// Check for context cancellation before creating script file
	if ctx.Err() != nil {
		return result, ctx.Err()
	}

	// Determine executable type and file name based on script language
	executableType, scriptFileName, err := s.determineExecutableTypeAndFileName(script.Language)
	if err != nil {
		return result, err
	}

	// Write script content to file
	scriptPath := filepath.Join(workspaceTempDir, scriptFileName)
	//nolint:gosec // G306: Group-readable is intentional for shared access between appuser and sandbox
	if writeErr := os.WriteFile(scriptPath, []byte(script.Content), 0660); writeErr != nil {
		return result, fmt.Errorf("failed to write script file: %w", writeErr)
	}

	s.logger.InfoContext(ctx, "Script file created", "scriptPath", scriptPath, "language", script.Language)

	// Setup SDK based on executable type (executableType already handles language aliases)
	if executableType == RuntimeTypeGo {
		if installGoSDKErr := s.executor.installGoSDK(ctx, workspaceTempDir, filepath.Base(workspaceTempDir)); installGoSDKErr != nil {
			return result, installGoSDKErr
		}
	}
	// ... handle more SDK installations here (once they are implemented) ...

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
		// Use context.Background() to ensure token cleanup executes even if ctx is cancelled
		cleanupCtx := context.Background()
		if deleteAPITokenErr := s.d.DeleteAPIToken(apiToken.ID); deleteAPITokenErr != nil {
			s.logger.ErrorContext(
				cleanupCtx,
				"error revoking token after sandbox execution",
				"error",
				deleteAPITokenErr,
			)
		}
	}()

	// Execute script
	return s.executor.execute(
		ctx,
		workspaceTempDir,
		scriptFileName,
		executableType,
		apiToken.Token,
		fmt.Sprintf("%s/api", s.env.URL),
	)
}

// setupWorkspaceFiles handles the creation of temporary directory and writing input files.
//
//nolint:gocognit,funlen // Complexity is acceptable for file setup with proper error handling
func (s *ComputeSandbox) setupWorkspaceFiles(
	ctx context.Context,
	scriptID uint,
	inputFiles map[string][]byte,
) (string, error) {
	// Check for context cancellation before starting
	if ctx.Err() != nil {
		return "", ctx.Err()
	}

	// Generate a short random suffix (8 chars) for uniqueness
	randomBytes := make([]byte, 4) //nolint:mnd // 4 bytes is enough for a random suffix
	if _, err := rand.Read(randomBytes); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}
	randomSuffix := hex.EncodeToString(randomBytes)

	// Create directory name with timestamp and random suffix: script-{scriptID}-{timestamp}-{random}
	timestamp := time.Now().Unix()
	tempDirName := fmt.Sprintf("script-%d-%d-%s", scriptID, timestamp, randomSuffix)

	// Get sandbox base directory from environment or use default
	sandboxBaseDir := s.env.ComputeSandboxDir
	if sandboxBaseDir == "" {
		// Default to system temp directory for development environments
		sandboxBaseDir = os.TempDir()
	}

	// Ensure the path is absolute (required for Go's GOPATH)
	var err error
	sandboxBaseDir, err = filepath.Abs(sandboxBaseDir)
	if err != nil {
		return "", fmt.Errorf("failed to resolve absolute path for sandbox directory: %w", err)
	}

	// Create workspace directory directly under base dir (simpler structure)
	workspaceTempDir := filepath.Join(sandboxBaseDir, tempDirName)
	// Use setgid (02770) - files created inside inherit group ownership
	//nolint:gosec // G301: Group-writable with setgid for shared access between appuser and sandbox
	if mkdirAllErr := os.MkdirAll(workspaceTempDir, 02770); mkdirAllErr != nil {
		return "", mkdirAllErr
	}

	// Explicitly set permissions with setgid bit to ensure group inheritance
	//nolint:gosec // G302: Group-writable with setgid for shared access
	if chmodErr := os.Chmod(workspaceTempDir, 02770); chmodErr != nil {
		// Return workspaceTempDir (not empty string) so caller can clean it up
		return workspaceTempDir, fmt.Errorf("failed to set permissions on workspace: %w", chmodErr)
	}

	s.logger.InfoContext(ctx, "Temporary directory created",
		"workspaceTempDir", workspaceTempDir)

	// Create and populate _input directory with setgid bit for group inheritance
	inputDir := filepath.Join(workspaceTempDir, "_input")
	//nolint:gosec // G301: Group-writable with setgid for shared access between appuser and sandbox
	if mkdirAllErr := os.MkdirAll(inputDir, 02770); mkdirAllErr != nil {
		return workspaceTempDir, fmt.Errorf("failed to create _input directory: %w", mkdirAllErr)
	}

	// Explicitly set permissions with setgid bit on _input directory
	//nolint:gosec // G302: Group-writable with setgid for shared access
	if chmodErr := os.Chmod(inputDir, 02770); chmodErr != nil {
		return workspaceTempDir, fmt.Errorf("failed to set permissions on _input: %w", chmodErr)
	}

	// Create .tmp directory for TMPDIR environment variable
	tmpDir := filepath.Join(workspaceTempDir, ".tmp")
	//nolint:gosec // G301: Group-writable with setgid for shared access between appuser and sandbox
	if mkdirErr := os.MkdirAll(tmpDir, 02770); mkdirErr != nil {
		return workspaceTempDir, fmt.Errorf("failed to create .tmp directory: %w", mkdirErr)
	}

	//nolint:gosec // G302: Group-writable with setgid for shared access
	if chmodErr := os.Chmod(tmpDir, 02770); chmodErr != nil {
		return workspaceTempDir, fmt.Errorf("failed to set permissions on .tmp: %w", chmodErr)
	}

	// Create Go-related directories
	goTmpDir := filepath.Join(workspaceTempDir, ".go", "tmp")
	//nolint:gosec // G301: Group-writable with setgid for shared access between appuser and sandbox
	if mkdirErr := os.MkdirAll(goTmpDir, 02770); mkdirErr != nil {
		return workspaceTempDir, fmt.Errorf("failed to create .go/tmp directory: %w", mkdirErr)
	}

	//nolint:gosec // G302: Group-writable with setgid for shared access
	if chmodErr := os.Chmod(goTmpDir, 02770); chmodErr != nil {
		return workspaceTempDir, fmt.Errorf("failed to set permissions on .go/tmp: %w", chmodErr)
	}

	goCacheDir := filepath.Join(workspaceTempDir, ".go", "cache")
	//nolint:gosec // G301: Group-writable with setgid for shared access between appuser and sandbox
	if mkdirErr := os.MkdirAll(goCacheDir, 02770); mkdirErr != nil {
		return workspaceTempDir, fmt.Errorf("failed to create .go/cache directory: %w", mkdirErr)
	}

	//nolint:gosec // G302: Group-writable with setgid for shared access
	if chmodErr := os.Chmod(goCacheDir, 02770); chmodErr != nil {
		return workspaceTempDir, fmt.Errorf("failed to set permissions on .go/cache: %w", chmodErr)
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

			// Validate input file path to prevent directory traversal attacks
			if strings.Contains(filePath, "..") {
				done <- fmt.Errorf("input file path contains directory traversal: %s", filePath)
				return
			}

			if filepath.IsAbs(filePath) {
				done <- fmt.Errorf("input file path must be relative: %s", filePath)
				return
			}

			fullPath := filepath.Join(inputDir, filePath)
			// Clean the path to resolve any remaining ".." or "." components
			fullPath = filepath.Clean(fullPath)

			// Verify resolved path is still within inputDir to prevent path traversal
			// Get absolute paths for comparison
			absInputDir, absErr := filepath.Abs(inputDir)
			if absErr != nil {
				done <- fmt.Errorf("failed to resolve absolute path for input directory: %w", absErr)
				return
			}
			absFullPath, absErr := filepath.Abs(fullPath)
			if absErr != nil {
				done <- fmt.Errorf("failed to resolve absolute path for input file: %w", absErr)
				return
			}

			// Check if the resolved path is still within inputDir
			relPath, relErr := filepath.Rel(absInputDir, absFullPath)
			if relErr != nil || strings.HasPrefix(relPath, "..") {
				done <- fmt.Errorf("input file path resolves outside input directory: %s", filePath)
				return
			}

			dirPath := filepath.Dir(fullPath)

			// Create directory structure with setgid bit for group inheritance
			//nolint:gosec // G301: Group-writable with setgid for shared access between appuser and sandbox
			if mkdirAllErr := os.MkdirAll(dirPath, 02770); mkdirAllErr != nil {
				done <- fmt.Errorf("failed to create directory for input file %s: %w", filePath, mkdirAllErr)
				return
			}

			// Write file with group-readable permissions
			//nolint:gosec // G306: Group-readable is intentional for shared access between appuser and sandbox
			if writeFileErr := os.WriteFile(fullPath, content, 0660); writeFileErr != nil {
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

// buildScriptLockKey creates a unique lock key for a script execution
// based on the script ID.
func (s *ComputeSandbox) buildScriptLockKey(scriptID uint) string {
	return fmt.Sprintf("script:id:%d", scriptID)
}

// determineExecutableTypeAndFileName maps script language to runtime type and determines the script file name.
func (s *ComputeSandbox) determineExecutableTypeAndFileName(language string) (string, string, error) {
	languageLower := strings.ToLower(strings.TrimSpace(language))
	var executableType string
	var fileName string

	switch languageLower {
	case "python", "py":
		executableType = RuntimeTypePython
		fileName = "script.py"
	case "go", "golang":
		executableType = RuntimeTypeGo
		fileName = "main.go"
	case "javascript", "js", "typescript", "ts", "node", "nodejs":
		executableType = RuntimeTypeNode
		fileName = "script.js"
	default:
		return "", "", fmt.Errorf("unsupported script language: %s", language)
	}

	return executableType, fileName, nil
}
