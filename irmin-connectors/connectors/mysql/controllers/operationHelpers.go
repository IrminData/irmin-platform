package mysqlcontrollers

import (
	"fmt"
	mysqlclient "irmin-connectors/connectors/mysql/client"
	"irmin-connectors/db"

	"github.com/gofiber/fiber/v3"
)

// operationResponse represents the standard response for operation endpoints.
type operationResponse struct {
	Message     string `json:"message"`
	OperationID uint   `json:"operation_id"`
}

// executeOperation is a helper function that reduces code duplication across operation controllers.
func (cs *Controllers) executeOperation(
	c fiber.Ctx,
	operationType string,
	operationLogic func(mysqlClient *mysqlclient.MySQLClient, dbName *string) error,
) error {
	// Get the operation from the context (set by middleware)
	operation, ok := c.Locals("operation").(*db.Operation)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid operation type in context",
		})
	}

	ctx := c.Context()

	// Initialize the MySQL client
	mysqlClient, dbName, err := mysqlclient.InitMySQLClient(ctx, cs.Logger, operation)
	if err != nil {
		cs.Logger.ErrorContext(ctx, "Failed to initialize MySQL client",
			"error", err,
			"operation_id", operation.ID,
			"operation_type", operationType)

		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to connect to MySQL database",
		})
	}
	defer func() {
		if closeErr := mysqlClient.Close(); closeErr != nil {
			cs.Logger.ErrorContext(ctx, "Failed to close MySQL client",
				"error", closeErr,
				"operation_id", operation.ID,
				"operation_type", operationType)
		}
	}()

	cs.Logger.InfoContext(ctx, fmt.Sprintf("Starting MySQL %s operation", operationType),
		"operation_id", operation.ID,
		"database", dbName,
		"operation_type", operationType)

	// Execute the operation-specific logic
	if logicErr := operationLogic(mysqlClient, dbName); logicErr != nil {
		cs.Logger.ErrorContext(ctx, fmt.Sprintf("MySQL %s operation failed", operationType),
			"error", logicErr,
			"operation_id", operation.ID,
			"database", dbName,
			"operation_type", operationType)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": fmt.Sprintf("%s operation failed: %v", operationType, logicErr),
		})
	}

	cs.Logger.InfoContext(ctx, fmt.Sprintf("MySQL %s operation completed", operationType),
		"operation_id", operation.ID,
		"database", dbName,
		"operation_type", operationType)

	return c.Status(fiber.StatusOK).JSON(operationResponse{
		Message:     fmt.Sprintf("%s operation completed for database: %s", operationType, *dbName),
		OperationID: operation.ID,
	})
}
