package sandbox

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/utils"
	"log/slog"
	"strings"
	"time"
)

// ErrScriptAlreadyRunning is returned when attempting to execute a script
// that is already being executed by another session.
var ErrScriptAlreadyRunning = errors.New("script is already being executed")

// ComputeSandbox provides isolated script execution using Daytona sandboxes.
type ComputeSandbox struct {
	// env is the environment configuration.
	env *utils.CoreAPIEnv
	// d is the database for token management and locking.
	d *db.Database
	// logger is the structured logger.
	logger *slog.Logger
	// daytona is the Daytona SDK client wrapper.
	daytona *daytonaClient
}

// NewComputeSandbox creates a new ComputeSandbox.
// Returns an error if the Daytona client cannot be initialized.
func NewComputeSandbox(env *utils.CoreAPIEnv, d *db.Database, logger *slog.Logger) *ComputeSandbox {
	dc, err := newDaytonaClient(env, logger)
	if err != nil {
		logger.Error("Failed to initialize Daytona client, sandbox execution will fail", "error", err)
	}

	return &ComputeSandbox{
		env:     env,
		d:       d,
		logger:  logger,
		daytona: dc,
	}
}

// ExecutedStoredScript executes the provided stored script in an isolated Daytona sandbox.
// It acquires an advisory lock to prevent concurrent execution of the same script,
// creates a temporary API token, and delegates execution to the Daytona sandbox.
func (s *ComputeSandbox) ExecutedStoredScript(
	ctx context.Context,
	inputFiles map[string][]byte,
	responsibleUser db.User,
	script *db.StoredScript,
) (ExecutionResult, error) {
	var result ExecutionResult

	// Ensure Daytona client is available
	if s.daytona == nil {
		return result, errors.New("daytona client is not initialized; check DAYTONA_API_KEY configuration")
	}

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

	// Check for context cancellation before creating token
	if ctx.Err() != nil {
		return result, ctx.Err()
	}

	// Determine executable type and file name based on script language
	executableType, scriptFileName, err := s.determineExecutableTypeAndFileName(script.Language)
	if err != nil {
		return result, err
	}

	// Create temporary API token
	apiToken, err := s.createTemporaryToken(
		fmt.Sprintf("sandbox-%d-%d", script.ID, time.Now().Unix()),
		responsibleUser,
	)
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

	// Execute script in Daytona sandbox
	return s.executeDaytona(
		ctx,
		script.Content,
		inputFiles,
		executableType,
		scriptFileName,
		apiToken.Token,
		fmt.Sprintf("%s/api", s.env.URL),
	)
}

// createTemporaryToken creates a temporary API token for sandbox execution.
func (s *ComputeSandbox) createTemporaryToken(name string, user db.User) (*db.APIToken, error) {
	token, err := utils.GenerateRandomString()
	if err != nil {
		return nil, err
	}

	apiToken := &db.APIToken{
		Name:      name,
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
	case "javascript", "js", "node", "nodejs":
		executableType = RuntimeTypeNode
		fileName = "script.js"
	case "typescript", "ts":
		executableType = RuntimeTypeNode
		fileName = "script.ts"
	default:
		return "", "", fmt.Errorf("unsupported script language: %s", language)
	}

	return executableType, fileName, nil
}
