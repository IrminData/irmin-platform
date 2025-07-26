package common

import (
	"irmin-connectors/db"
	"irmin-connectors/models"
	"irmin-connectors/utils"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

// OperationCancelConfig holds configuration for operation cancellation.
type OperationCancelConfig struct {
	App              *models.ConnectorsApp
	ConnectorInfo    *models.ConnectorDetails
	Operation        *db.Operation
	CancellationFunc func(*models.ConnectorsApp, *db.Operation) error // Optional custom cancellation logic
}

// CancelOperation handles the common logic for operation cancellation.
// It validates the request, finds the operation, verifies ownership, and calls the provided cancellation function.
func CancelOperation(
	c fiber.Ctx,
	app *models.ConnectorsApp,
	cancellationFunc func(*models.ConnectorsApp, *db.Operation) error,
) error {
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

	// Validate and parse operation ID
	operationID, err := strconv.Atoi(fields["operation_id"])
	if err != nil || operationID < 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid operation ID",
		})
	}

	// Find the operation
	operation, err := app.DB.GetOperationByID(uint(operationID))
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

	// Verify operation belongs to the correct connector
	connectorRegistration, err := app.DB.GetConnectorRegistrationByID(operation.ConnectorRegistrationID)
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

	// Execute custom cancellation logic if provided
	if cancellationFunc != nil {
		if err = cancellationFunc(app, operation); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to cancel operation: " + err.Error(),
			})
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Operation cancelled successfully",
	})
}

// DefaultDatabaseCancellation provides the standard cancellation logic for database connectors.
// It deletes subscriptions and then deletes the operation.
func DefaultDatabaseCancellation(app *models.ConnectorsApp, operation *db.Operation) error {
	// Delete subscriptions associated with the operation
	if err := app.DB.DeleteSubscriptionsByOperationID(operation.ID); err != nil {
		return err
	}

	// Delete the operation
	if err := app.DB.DeleteOperation(operation.ID); err != nil {
		return err
	}

	return nil
}

// LogOnlyCancellation provides a simple logging-only cancellation for connectors that don't implement full cancellation yet.
func LogOnlyCancellation(app *models.ConnectorsApp, operation *db.Operation) error {
	app.Logger.Info("Operation cancelled", "operation_id", operation.ID)
	return nil
}
