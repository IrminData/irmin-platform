package mysqlcontrollers

import (
	"irmin-connectors/models"
	"irmin-connectors/utils"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

// OperationCancel handles the cancellation of an operation.
func (cs *Controllers) OperationCancel(c fiber.Ctx) error {
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
	if connectorRegistration == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Connector registration not found",
		})
	}
	if connectorRegistration.ConnectorName != info.Name {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Operation not found",
		})
	}

	// Delete subscriptions associated with the operation
	if err = cs.DB.DeleteSubscriptionsByOperationID(operation.ID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete subscriptions",
		})
	}

	// Cancel the operation
	if err = cs.DB.DeleteOperation(operation.ID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to cancel operation",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Operation cancelled",
	})
}
