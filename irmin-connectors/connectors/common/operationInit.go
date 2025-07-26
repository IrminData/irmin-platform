package common

import (
	"encoding/json"
	"irmin-connectors/db"
	"irmin-connectors/models"
	"irmin-connectors/utils"

	"github.com/gofiber/fiber/v3"
	"gorm.io/datatypes"
)

// OperationInitProvider defines the interface for initializing connector operations.
type OperationInitProvider interface {
	// GetOperationFormFields returns the list of required and optional form field names
	GetOperationFormFields() (required []string, optional []string)

	// BuildDetails constructs the details JSON from parsed form fields
	BuildDetails(fields map[string]string) (map[string]string, error)

	// BuildSettings constructs the settings JSON from parsed form fields
	BuildSettings(fields map[string]string) (map[string]string, error)
}

// HandleOperationInit provides a common HTTP handler for operation initialization endpoints.
func (cs *Controllers) HandleOperationInit(c fiber.Ctx, provider OperationInitProvider) error {
	// Get the connector info from the context
	info, ok := c.Locals("connectorInfo").(*models.ConnectorDetails)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid connector info type in context",
		})
	}

	// Get required and optional form fields from the provider
	requiredFields, optionalFields := provider.GetOperationFormFields()

	// Parse form fields
	fields, err := utils.ParseFormFields(c, requiredFields, optionalFields)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Find relevant connector registration
	connectorRegistrations, err := cs.DB.GetConnectorRegistrationByConnectorName(info.Name)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to find connector registration",
		})
	}
	if len(connectorRegistrations) == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Connector registration not found",
		})
	}
	connectorRegistration := connectorRegistrations[0]

	// Create a new operation token
	operationToken, err := utils.GenerateToken(utils.DefaultTokenLength)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate operation token",
		})
	}

	// Build details using the provider
	detailsMap, err := provider.BuildDetails(fields)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Failed to build details: " + err.Error(),
		})
	}

	// Build settings using the provider
	settingsMap, err := provider.BuildSettings(fields)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Failed to build settings: " + err.Error(),
		})
	}

	// Marshal details to JSON
	details, err := json.Marshal(detailsMap)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to marshal details",
		})
	}

	// Marshal settings to JSON
	settings, err := json.Marshal(settingsMap)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to marshal settings",
		})
	}

	// Create a new operation
	operation := &db.Operation{
		Details:                 datatypes.JSON(details),
		Settings:                datatypes.JSON(settings),
		Token:                   operationToken,
		ConnectorRegistrationID: connectorRegistration.ID,
	}

	// Save the operation to the database
	operation, err = cs.DB.CreateOperation(operation)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create operation",
		})
	}

	// Send the response
	return c.Status(fiber.StatusOK).JSON(operation)
}
