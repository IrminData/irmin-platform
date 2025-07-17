package sftpcontrollers

import (
	"encoding/json"
	"irmin-connectors/db"
	"irmin-connectors/models"
	"irmin-connectors/utils"

	"github.com/gofiber/fiber/v3"
	"gorm.io/datatypes"
)

// OperationInit initializes SFTP operations with connection testing.
func (cs *Controllers) OperationInit(c fiber.Ctx) error {
	// Get the connector info from the context
	info, ok := c.Locals("connectorInfo").(*models.ConnectorDetails)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid connector info type in context",
		})
	}

	// Get the form values from the request
	fields, err := utils.ParseFormFields(
		c,
		nil,
		[]string{
			"details[host]",
			"details[port]",
			"details[username]",
			"details[password]",
			"details[private_key]",
			"details[private_key_passphrase]",
			"details[host_key_fingerprint]",
			"settings[remote_path]",
			"settings[file_patterns]",
			"settings[preserve_timestamps]",
			"settings[overwrite_existing]",
			"settings[create_directories]",
			"settings[transfer_mode]",
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
		"host":                   fields["details[host]"],
		"port":                   fields["details[port]"],
		"username":               fields["details[username]"],
		"password":               fields["details[password]"],
		"private_key":            fields["details[private_key]"],
		"private_key_passphrase": fields["details[private_key_passphrase]"],
		"host_key_fingerprint":   fields["details[host_key_fingerprint]"],
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to marshal details",
		})
	}

	// Construct the settings JSON
	settings, err := json.Marshal(map[string]string{
		"remote_path":         fields["settings[remote_path]"],
		"file_patterns":       fields["settings[file_patterns]"],
		"preserve_timestamps": fields["settings[preserve_timestamps]"],
		"overwrite_existing":  fields["settings[overwrite_existing]"],
		"create_directories":  fields["settings[create_directories]"],
		"transfer_mode":       fields["settings[transfer_mode]"],
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
