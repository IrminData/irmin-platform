package common

import (
	"encoding/json"
	"errors"
	"irmin-connectors/db"
	"log/slog"
	"slices"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// SchemaOperationProvider defines the interface for connector-specific schema operation handling.
type SchemaOperationProvider interface {
	// InitializeClient initializes the client for schema operations
	InitializeClient(
		c fiber.Ctx,
		logger *slog.Logger,
		operation *db.Operation,
	) (client any, path *string, cleanup func(), err error)

	// GetSchema retrieves the schema for the specified operation type
	GetSchema(c fiber.Ctx, client any, operationType string, path *string) (*irminmodels.ObjectSchema, error)

	// GetSupportedOperationTypes returns the list of supported operation types for this connector
	GetSupportedOperationTypes() []string
}

// CapabilitiesToOperationTypes converts connector capabilities to supported operation types.
func CapabilitiesToOperationTypes(capabilities []irminmodels.ConnectorCapability) []string {
	operationTypes := make([]string, 0, len(capabilities))

	for _, capability := range capabilities {
		switch capability {
		case irminmodels.ConnectorCapabilityPull:
			operationTypes = append(operationTypes, "pull")
		case irminmodels.ConnectorCapabilityPush:
			operationTypes = append(operationTypes, "push")
		case irminmodels.ConnectorCapabilityPushPatch:
			operationTypes = append(operationTypes, "patch")
		case irminmodels.ConnectorCapabilityEventWebhook:
			operationTypes = append(operationTypes, "subscribe")
		}
	}

	return operationTypes
}

// HandleOperationSchemaGet provides a common HTTP handler for schema operation endpoints.
func HandleOperationSchemaGet(c fiber.Ctx, provider SchemaOperationProvider, logger *slog.Logger) error {
	// Get the operation from the context
	operation, ok := c.Locals("operation").(*db.Operation)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid operation type in context",
		})
	}

	// Get the operation type from the URL parameter
	operationType := c.Params("operation")
	if operationType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Operation type is required",
		})
	}

	// Validate operation type against supported types
	supportedTypes := provider.GetSupportedOperationTypes()
	isSupported := slices.Contains(supportedTypes, operationType)

	if !isSupported {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid operation type. Supported types: " + joinStrings(supportedTypes, ", "),
		})
	}

	// Initialize the client
	client, defaultPath, cleanup, err := provider.InitializeClient(c, logger, operation)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize client: " + err.Error(),
		})
	}
	defer cleanup()

	// Check for path query parameter to specify which resource to analyze.
	// The path parameter allows navigation within the connected system (e.g., /data/file.csv for SFTP,
	// database_name for SQL, /api/endpoint for HTTP). If not provided, uses the default path from
	// operation settings or connector-specific defaults.
	queryPath := c.Query("path")
	var finalPath *string
	if queryPath != "" {
		finalPath = &queryPath
	} else {
		finalPath = defaultPath
	}

	// Get the schema from the provider
	schema, err := provider.GetSchema(c, client, operationType, finalPath)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get schema: " + err.Error(),
		})
	}

	// Write JSON response
	c.Set("Content-Type", "application/json")
	if err = json.NewEncoder(c.Response().BodyWriter()).Encode(schema); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to encode schema: " + err.Error(),
		})
	}

	return nil
}

// NotSupportedSchemaProvider provides a default implementation for connectors that don't support schema operations.
type NotSupportedSchemaProvider struct{}

// InitializeClient returns an error indicating schema operations are not supported.
func (p *NotSupportedSchemaProvider) InitializeClient(
	_ fiber.Ctx,
	_ *slog.Logger,
	_ *db.Operation,
) (any, *string, func(), error) {
	return nil, nil, func() {}, errors.New("schema operations are not supported by this connector")
}

// GetSchema returns an error indicating schema operations are not supported.
func (p *NotSupportedSchemaProvider) GetSchema(
	_ fiber.Ctx,
	_ any,
	_ string,
	_ *string,
) (*irminmodels.ObjectSchema, error) {
	return nil, errors.New("schema operations are not supported by this connector")
}

// GetSupportedOperationTypes returns an empty slice for unsupported connectors.
func (p *NotSupportedSchemaProvider) GetSupportedOperationTypes() []string {
	return []string{}
}

// HandleNotSupportedSchemaGet provides a common handler for connectors that don't support schema operations.
func HandleNotSupportedSchemaGet(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "This connector does not support schema operations.",
	})
}

// joinStrings joins a slice of strings with a separator (helper function).
func joinStrings(strs []string, sep string) string {
	if len(strs) == 0 {
		return ""
	}
	if len(strs) == 1 {
		return strs[0]
	}

	result := strs[0]
	for i := 1; i < len(strs); i++ {
		result += sep + strs[i]
	}
	return result
}
