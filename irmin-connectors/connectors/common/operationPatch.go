package common

import (
	"encoding/json"
	"errors"
	"io"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"log/slog"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// PatchOperationProvider defines the interface for connector-specific patch operation handling.
type PatchOperationProvider interface {
	// InitializeClient initializes the database client for patch operations
	InitializeClient(c fiber.Ctx, logger *slog.Logger, operation *db.Operation) (client any, cleanup func(), err error)

	// ExecutePatchOperation executes a single patch operation within a transaction
	ExecutePatchOperation(
		c fiber.Ctx,
		client any,
		op irminmodels.PatchOperation,
		tableName, rowIdentifier, columnName string,
	) error
}

// HandleOperationPatch provides a common HTTP handler for patch operation endpoints.
func HandleOperationPatch(c fiber.Ctx, provider PatchOperationProvider, logger *slog.Logger) error {
	// Get the operation from the context
	operation, ok := c.Locals("operation").(*db.Operation)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid operation type in context",
		})
	}

	// Initialize the database client
	client, cleanup, err := provider.InitializeClient(c, logger, operation)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize database client: " + err.Error(),
		})
	}
	defer cleanup()

	// Retrieve the patch file from the form
	fileHeader, err := c.FormFile("patches")
	if errors.Is(err, http.ErrMissingFile) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No JSON patch file uploaded with form field 'patches'",
		})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve form file: " + err.Error(),
		})
	}

	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to open form file: " + err.Error(),
		})
	}
	defer file.Close()

	// Read the entire file into memory
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read uploaded file: " + err.Error(),
		})
	}

	// Unmarshal the JSON into a slice of patch operations
	var operations []irminmodels.PatchOperation
	if err = json.Unmarshal(fileBytes, &operations); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to parse JSON data: " + err.Error(),
		})
	}

	// Apply each patch operation to the database
	for _, op := range operations {
		// Extract details from the operation path
		_, tableName, rowIdentifier, columnName := utils.ExtractPathComponents(op.Path)

		// Execute the operation using the provider
		if err = provider.ExecutePatchOperation(c, client, op, tableName, rowIdentifier, columnName); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
	}

	// Send a success response
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Patch operations applied successfully",
	})
}

// NotSupportedPatchProvider provides a default implementation for connectors that don't support patch operations.
type NotSupportedPatchProvider struct{}

// InitializeClient returns an error indicating patch operations are not supported.
func (p *NotSupportedPatchProvider) InitializeClient(
	_ fiber.Ctx,
	_ *slog.Logger,
	_ *db.Operation,
) (any, func(), error) {
	return nil, func() {}, errors.New("patch operations are not supported by this connector")
}

// ExecutePatchOperation returns an error indicating patch operations are not supported.
func (p *NotSupportedPatchProvider) ExecutePatchOperation(
	_ fiber.Ctx,
	_ any,
	_ irminmodels.PatchOperation,
	_, _, _ string,
) error {
	return errors.New("patch operations are not supported by this connector")
}

// HandleNotSupportedPatch provides a common handler for connectors that don't support patch operations.
func HandleNotSupportedPatch(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "This connector does not support patch operations.",
	})
}
