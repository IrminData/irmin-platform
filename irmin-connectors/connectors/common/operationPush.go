package common

import (
	"errors"
	"fmt"
	"io"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"log/slog"

	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"github.com/gofiber/fiber/v3"
)

// PushOperationProvider defines the interface for connector-specific push operation handling.
type PushOperationProvider interface {
	// InitializeClient initializes the client for push operations
	InitializeClient(
		c fiber.Ctx,
		logger *slog.Logger,
		operation *db.Operation,
	) (client any, databaseName *string, cleanup func(), err error)

	// ProcessFiles processes the extracted files and uploads/inserts them
	ProcessFiles(c fiber.Ctx, client any, files map[string][]byte, targetPath string) error
}

// HandleOperationPush provides a common HTTP handler for push operation endpoints.
func HandleOperationPush(
	c fiber.Ctx,
	provider PushOperationProvider,
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

	// Log operation execution start
	LogOperationEvent(
		dbInstance,
		logger,
		operation.ID,
		db.LogEventTypeInfo,
		"Push operation execution started",
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
			"Failed to initialize client for push operation",
			map[string]any{
				"error": err.Error(),
			},
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize client: " + err.Error(),
		})
	}
	defer cleanup()

	// Parse form fields for target path
	fields, err := utils.ParseFormFields(c, nil, []string{"path"})
	if err != nil {
		LogOperationEvent(
			dbInstance,
			logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to parse form fields for push operation",
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

	// Handle uploaded file
	files, err := handleUploadedFile(c)
	if err != nil {
		LogOperationEvent(
			dbInstance,
			logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to handle uploaded file for push operation",
			map[string]any{
				"error": err.Error(),
			},
		)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	if len(files) == 0 {
		LogOperationEvent(
			dbInstance,
			logger,
			operation.ID,
			db.LogEventTypeError,
			"No files found in uploaded ZIP",
			nil,
		)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No files found in uploaded ZIP",
		})
	}

	// Process files using provider
	err = provider.ProcessFiles(c, client, files, rawPath)
	if err != nil {
		logger.Error("failed to process files", "error", err)
		LogOperationEvent(
			dbInstance,
			logger,
			operation.ID,
			db.LogEventTypeError,
			"Failed to process files during push operation",
			map[string]any{
				"error": err.Error(),
				"path":  rawPath,
			},
		)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to process files: " + err.Error(),
		})
	}

	// Log successful completion
	LogOperationEvent(
		dbInstance,
		logger,
		operation.ID,
		db.LogEventTypeInfo,
		"Push operation completed successfully",
		map[string]any{
			"file_count": len(files),
			"path":       rawPath,
		},
	)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Successfully pushed data",
		"status":  "completed",
	})
}

// handleUploadedFile processes the uploaded ZIP file and returns the extracted files.
func handleUploadedFile(c fiber.Ctx) (map[string][]byte, error) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve form file: %w", err)
	}

	file, err := fileHeader.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open form file: %w", err)
	}
	defer file.Close()

	bytesData, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("failed to read uploaded file: %w", err)
	}

	files, err := irminutils.UnzipFiles(bytesData)
	if err != nil {
		return nil, fmt.Errorf("failed to unzip file: %w", err)
	}

	return files, nil
}

// NotSupportedPushProvider provides a default implementation for connectors that don't support push operations.
type NotSupportedPushProvider struct{}

// InitializeClient returns an error indicating push operations are not supported.
func (p *NotSupportedPushProvider) InitializeClient(
	_ fiber.Ctx,
	_ *slog.Logger,
	_ *db.Operation,
) (any, *string, func(), error) {
	return nil, nil, func() {}, errors.New("push operations are not supported by this connector")
}

// ProcessFiles returns an error indicating push operations are not supported.
func (p *NotSupportedPushProvider) ProcessFiles(
	_ fiber.Ctx,
	_ any,
	_ map[string][]byte,
	_ string,
) error {
	return errors.New("push operations are not supported by this connector")
}

// HandleNotSupportedPush provides a common handler for connectors that don't support push operations.
func HandleNotSupportedPush(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "This connector does not support push operations.",
	})
}
