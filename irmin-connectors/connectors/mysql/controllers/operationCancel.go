package mysqlcontrollers

import (
	"irmin-connectors/db"

	"github.com/gofiber/fiber/v3"
)

// OperationCancel handles the cancellation of an operation.
func (cs *Controllers) OperationCancel(c fiber.Ctx) error {
	// Get the operation from the context (set by middleware)
	operation, ok := c.Locals("operation").(*db.Operation)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid operation type in context",
		})
	}

	// Delete subscriptions associated with the operation
	if err := cs.DB.DeleteSubscriptionsByOperationID(operation.ID); err != nil {
		cs.Logger.Error("Failed to delete subscriptions",
			"error", err,
			"operation_id", operation.ID)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete subscriptions",
		})
	}

	// Cancel the operation by deleting it
	if err := cs.DB.DeleteOperation(operation.ID); err != nil {
		cs.Logger.Error("Failed to cancel operation",
			"error", err,
			"operation_id", operation.ID)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to cancel operation",
		})
	}

	cs.Logger.Info("Operation cancelled successfully",
		"operation_id", operation.ID)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Operation cancelled",
	})
}
