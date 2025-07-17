package sftpcontrollers

import (
	"irmin-connectors/models"
	"irmin-connectors/utils"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

// OperationStatus returns operation status and progress for SFTP operations.
func (cs *Controllers) OperationStatus(c fiber.Ctx) error {
	// Get the connector info from the context
	info, ok := c.Locals("connectorInfo").(*models.ConnectorDetails)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid connector info type in context",
		})
	}

	// Get the form values from the request
	fields, err := utils.ParseFormFields(c, []string{"operation_id"}, nil)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Find the operation
	operationID, err := strconv.Atoi(fields["operation_id"])
	if err != nil || operationID < 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid operation ID",
		})
	}
	operation, err := cs.DB.GetOperationByID(uint(operationID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to find operation",
		})
	}
	if operation == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Operation not found",
		})
	}

	// Make sure the operation is for the correct connector
	connectorRegistration, err := cs.DB.GetConnectorRegistrationByID(operation.ConnectorRegistrationID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to find connector registration",
		})
	}
	if connectorRegistration.ConnectorName != info.Name {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Operation does not belong to SFTP connector",
		})
	}

	// Return the operation status
	return c.Status(fiber.StatusOK).JSON(operation)
}
