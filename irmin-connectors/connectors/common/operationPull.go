package common

import (
	"bytes"
	"errors"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"log/slog"

	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"github.com/gofiber/fiber/v3"
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

	// Use Level 2 lock to prevent concurrent execution of the same operation
	locked, err := db.TryLockOperationExecution(dbInstance.DB, operation.ID)
	if err != nil {
		logger.Error("failed to acquire operation execution lock", "error", err, "operation_id", operation.ID)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to acquire operation lock",
		})
	}
	if !locked {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"error": "Operation is already running",
		})
	}

	// Ensure lock is released when operation completes
	defer func() {
		if unlockErr := db.UnlockOperationExecution(dbInstance.DB, operation.ID); unlockErr != nil {
			logger.Error("failed to release operation execution lock", "error", unlockErr, "operation_id", operation.ID)
		}
	}()

	// Initialize the client
	client, _, cleanup, err := provider.InitializeClient(c, logger, operation)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize client: " + err.Error(),
		})
	}
	defer cleanup()

	// Parse "path" field from form
	fields, err := utils.ParseFormFields(c, nil, []string{"path"})
	if err != nil {
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
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create zip archive",
		})
	}

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
