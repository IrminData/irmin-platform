package postgrescontrollers

import (
	"encoding/json"
	"irmin-connectors/connectors/postgres/config"
	"irmin-connectors/db"
	"irmin-connectors/lib"
	"irmin-connectors/utils"

	"github.com/gofiber/fiber/v3"
	"gorm.io/datatypes"
)

// OperationInit handles the initialization of a new operation.
func (cs *Controllers) OperationInit(c fiber.Ctx) error {
	// Make sure the request is authorized by validating the system token
	info := config.GetConnectorInfo()
	if !lib.ValidateConnectorSystemToken(cs.DB, cs.Logger, c, info.Name) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Get the form values from the request
	fields, err := utils.ParseFormFields(
		c,
		nil,
		[]string{
			"details[host]",
			"details[port]",
			"details[user]",
			"details[password]",
			"details[default_db]",
			"details[ssl_mode]",
			"settings[database]",
		},
	)
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

	// Construct the details JSON
	details, err := json.Marshal(map[string]string{
		"host":       fields["details[host]"],
		"port":       fields["details[port]"],
		"user":       fields["details[user]"],
		"password":   fields["details[password]"],
		"default_db": fields["details[default_db]"],
		"ssl_mode":   fields["details[ssl_mode]"],
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to marshal details",
		})
	}

	// Construct the settings JSON
	settings, err := json.Marshal(map[string]string{
		"database": fields["settings[database]"],
	})
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
