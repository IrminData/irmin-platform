package common

import (
	"bytes"
	"errors"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"log/slog"

	irminutils "github.com/IrminData/irmin-sdk-go/utils"
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

	// Use a pinned connection for the session-scoped advisory lock to ensure
	// acquire and release happen on the same database session.
	locked, lockErr := db.WithOperationExecutionLock(dbInstance.DB, operation.ID, func(_ *gorm.DB) error {
		return executePullOperation(c, provider, logger, dbInstance, operation)
	})
	if lockErr != nil {
		logger.Error("failed during operation execution", "error", lockErr, "operation_id", operation.ID)
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

	// Create a zip archive of the result files
	zipBytes, err := irminutils.ZipFiles(resultFiles)
	if err != nil {
		logger.Error("failed to create zip archive", "error", err)
		LogOperationEvent(
			dbInstance,
			logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to create zip archive for pull operation",
			map[string]any{
				"error": err.Error(),
			},
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create zip archive",
		})
	}

	// Log successful completion
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

	// Return the result files as a zip archive stream
	c.Response().Header.Set("Content-Type", "application/zip")
	c.Response().Header.Set("Content-Disposition", "attachment; filename=result.zip")
	return c.Status(fiber.StatusOK).SendStream(bytes.NewReader(zipBytes))
}

// NotSupportedPullProvider provides a default implementation for connectors that don't support pull operations.
type NotSupportedPullProvider struct{}

// InitializeClient returns an error indicating pull operations are not supported.
func (p *NotSupportedPullProvider) InitializeClient(
	_ fiber.Ctx,
	_ *slog.Logger,
	_ *db.Operation,
) (any, *string, func(), error) {
	return nil, nil, func() {}, errors.New("pull operations are not supported by this connector")
}

// GetAllFiles returns an error indicating pull operations are not supported.
func (p *NotSupportedPullProvider) GetAllFiles(
	_ fiber.Ctx,
	_ any,
) ([]string, [][]byte, error) {
	return nil, nil, errors.New("pull operations are not supported by this connector")
}

// GetFileByPath returns an error indicating pull operations are not supported.
func (p *NotSupportedPullProvider) GetFileByPath(
	_ fiber.Ctx,
	_ any,
	_ string,
) (string, []byte, error) {
	return "", nil, errors.New("pull operations are not supported by this connector")
}

// HandleNotSupportedPull provides a common handler for connectors that don't support pull operations.
func HandleNotSupportedPull(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "This connector does not support pull operations.",
	})
}
