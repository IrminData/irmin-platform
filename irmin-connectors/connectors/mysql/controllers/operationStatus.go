package mysqlcontrollers

import (
	"irmin-connectors/db"

	"github.com/gofiber/fiber/v3"
)

// OperationStatus handles requests for operation status.
func (cs *Controllers) OperationStatus(c fiber.Ctx) error {
	// Get the operation from the context (set by middleware)
	operation, ok := c.Locals("operation").(*db.Operation)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid operation type in context",
		})
	}

	// Return the operation (for MySQL, operations are simple and don't have complex status tracking)
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"id":         operation.ID,
		"token":      operation.Token,
		"created_at": operation.CreatedAt,
		"updated_at": operation.UpdatedAt,
		"status":     "active", // All existing operations are considered active
	})
}
