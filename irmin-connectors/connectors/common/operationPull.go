package common

import (
	"archive/zip"
	"bytes"
	"errors"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"log/slog"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

// PullOperationProvider defines the interface for connector-specific pull operation handling.
type PullOperationProvider interface {
	// InitializeClient initializes the client for pull operations
	InitializeClient(
		c fiber.Ctx,
		logger *slog.Logger,
		operation *db.Operation,
	) (client any, databaseName *string, cleanup func(), err error)

	// GetAllFiles retrieves all available data as files
	GetAllFiles(c fiber.Ctx, client any) (filePaths []string, fileContents [][]byte, err error)

	// GetFileByPath retrieves a specific file by path
	GetFileByPath(c fiber.Ctx, client any, path string) (filePath string, fileContent []byte, err error)

	// ProgressHandler returns the observability callback this
	// provider wires into its client for per-page / per-batch /
	// per-file events. Return nil only if the underlying operations
	// are short enough not to need progress events (most
	// health-check style connectors) — the common pull handler
	// always wraps the provider call with a baseline heartbeat, so
	// returning nil does not leave the operation silent.
	ProgressHandler(operation *db.Operation) ProgressHandler
}

// HandleOperationPull provides a common HTTP handler for pull operation endpoints.
func HandleOperationPull(
	c fiber.Ctx,
	provider PullOperationProvider,
	logger *slog.Logger,
	dbInstance *db.Database,
) error {
	// Get the operation from the context
	operation, ok := c.Locals("operation").(*db.Operation)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid operation type in context",
		})
	}

	// Use WithOperationExecutionLock which pins the DB connection so that
	// acquire and release happen on the same session (required by PostgreSQL
	// session-scoped advisory locks). The zip is built in a buffer inside the
	// callback so the lock covers the entire operation; the buffer is sent
	// after the callback returns.
	locked, lockErr := db.WithOperationExecutionLock(
		dbInstance.DB,
		operation.ID,
		func(_ *gorm.DB) error {
			return executePullOperation(
				c, provider, logger, dbInstance, operation,
			)
		},
	)
	if lockErr != nil {
		logger.Error(
			"failed during operation execution",
			"error", lockErr,
			"operation_id", operation.ID,
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to execute operation",
		})
	}
	if !locked {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "Operation is already running",
		})
	}

	return nil
}

// executePullOperation performs the actual pull operation logic.
// The zip is built in a buffer so the advisory lock callback can complete
// synchronously — avoiding the deadlock that SendStreamWriter would cause
// (its callback runs after the handler returns, but the lock callback
// blocks the handler).
func executePullOperation(
	c fiber.Ctx,
	provider PullOperationProvider,
	logger *slog.Logger,
	dbInstance *db.Database,
	operation *db.Operation,
) error {
	// Log operation execution start
	LogOperationEvent(
		dbInstance,
		logger,
		operation.ID,
		db.LogEventTypeInfo,
		"Pull operation execution started",
		nil,
	)

	// Baseline heartbeat — fires every heartbeatInterval for the
	// duration of the operation, even if the provider's
	// ProgressHandler is nil. The goroutine exits as soon as the
	// deferred close(heartbeatStop) runs, before executePullOperation
	// returns, so we never leak past the operation.
	heartbeatStop := make(chan struct{})
	go startHeartbeat(dbInstance, logger, operation.ID, "operation/pull", heartbeatStop)
	defer close(heartbeatStop)

	// Initialize the client
	client, _, cleanup, err := provider.InitializeClient(c, logger, operation)
	if err != nil {
		LogOperationEvent(
			dbInstance,
			logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to initialize client for pull operation",
			map[string]any{
				"error": err.Error(),
			},
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize client: " + err.Error(),
		})
	}
	defer cleanup()

	// Parse "path" field from form
	fields, err := utils.ParseFormFields(c, nil, []string{"path"})
	if err != nil {
		LogOperationEvent(
			dbInstance,
			logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to parse form fields for pull operation",
			map[string]any{
				"error": err.Error(),
			},
		)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Pass raw path to provider for connector-specific processing
	rawPath := fields["path"]

	// Prepare the object to store the result files
	resultFiles := make(map[string][]byte)

	// Determine mode by path
	if rawPath == "" {
		// Return all available files
		resultPaths, resultContents, getErr := provider.GetAllFiles(c, client)
		if getErr != nil {
			logger.Error("failed to get all files", "error", getErr)
			LogOperationEvent(
				dbInstance,
				logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to get all files during pull operation",
				map[string]any{
					"error": getErr.Error(),
				},
			)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to get all files: " + getErr.Error(),
			})
		}
		for i, resultPath := range resultPaths {
			resultFiles[resultPath] = resultContents[i]
		}
	} else {
		// Return a specific file
		resultPath, resultContent, getErr := provider.GetFileByPath(c, client, rawPath)
		if getErr != nil {
			logger.Error("failed to get file", "error", getErr)
			LogOperationEvent(
				dbInstance,
				logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to get file during pull operation",
				map[string]any{
					"error": getErr.Error(),
					"path":  rawPath,
				},
			)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to get file: " + getErr.Error(),
			})
		}
		resultFiles[resultPath] = resultContent
	}

	// Build the zip into a buffer. The file contents are already in memory
	// (from GetAllFiles/GetFileByPath), so buffering the zip adds negligible
	// overhead and avoids the deadlock that SendStreamWriter would cause.
	var buf bytes.Buffer
	zipWriter := zip.NewWriter(&buf)

	for filePath, content := range resultFiles {
		entry, createErr := zipWriter.Create(filePath)
		if createErr != nil {
			LogOperationEvent(
				dbInstance, logger, operation.ID,
				db.LogEventTypeError,
				"Failed to create zip entry during pull operation",
				map[string]any{
					"error": createErr.Error(),
					"path":  filePath,
				},
			)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to create zip entry: " + createErr.Error(),
			})
		}
		if _, writeErr := entry.Write(content); writeErr != nil {
			LogOperationEvent(
				dbInstance, logger, operation.ID,
				db.LogEventTypeError,
				"Failed to write zip entry during pull operation",
				map[string]any{
					"error": writeErr.Error(),
					"path":  filePath,
				},
			)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to write zip entry: " + writeErr.Error(),
			})
		}
	}

	if closeErr := zipWriter.Close(); closeErr != nil {
		LogOperationEvent(
			dbInstance, logger, operation.ID,
			db.LogEventTypeError,
			"Failed to finalize zip archive during pull operation",
			map[string]any{
				"error": closeErr.Error(),
			},
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to finalize zip archive: " + closeErr.Error(),
		})
	}

	// Log success after all entries have been written.
	LogOperationEvent(
		dbInstance,
		logger,
		operation.ID,
		db.LogEventTypeInfo,
		"Pull operation completed successfully",
		map[string]any{
			"file_count": len(resultFiles),
			"path":       rawPath,
		},
	)

	c.Set("Content-Type", "application/zip")
	c.Set("Content-Disposition", "attachment; filename=result.zip")
	return c.Status(fiber.StatusOK).Send(buf.Bytes())
}

// NotSupportedPullProvider provides a default implementation for connectors that don't support pull operations.
type NotSupportedPullProvider struct{}

// InitializeClient returns an error indicating pull operations are not supported.
func (p *NotSupportedPullProvider) InitializeClient(
	_ fiber.Ctx,
	_ *slog.Logger,
	_ *db.Operation,
) (any, *string, func(), error) {
	return nil, nil, func() {}, errors.New(
		"pull operations are not supported by this connector",
	)
}

// GetAllFiles returns an error indicating pull operations are not supported.
func (p *NotSupportedPullProvider) GetAllFiles(
	_ fiber.Ctx,
	_ any,
) ([]string, [][]byte, error) {
	return nil, nil, errors.New(
		"pull operations are not supported by this connector",
	)
}

// GetFileByPath returns an error indicating pull operations are not supported.
func (p *NotSupportedPullProvider) GetFileByPath(
	_ fiber.Ctx,
	_ any,
	_ string,
) (string, []byte, error) {
	return "", nil, errors.New(
		"pull operations are not supported by this connector",
	)
}

// ProgressHandler returns nil — providers that reject every pull
// call have nothing to observe. The common pull handler's baseline
// heartbeat is still installed anyway, so a misrouted request to a
// push-only connector still surfaces a log row.
func (p *NotSupportedPullProvider) ProgressHandler(
	_ *db.Operation,
) ProgressHandler {
	return nil
}

// HandleNotSupportedPull provides a common handler for connectors that don't support pull operations.
func HandleNotSupportedPull(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "This connector does not support pull operations.",
	})
}
