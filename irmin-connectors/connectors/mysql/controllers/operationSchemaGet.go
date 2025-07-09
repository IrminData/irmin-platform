package mysqlcontrollers

import (
	"context"
	mysqlclient "irmin-connectors/connectors/mysql/client"
	"irmin-connectors/db"

	"github.com/gofiber/fiber/v3"
)

// OperationSchemaGet handles requests for schema information based on the operation.
func (cs *Controllers) OperationSchemaGet(c fiber.Ctx) error {
	// Get the operation from the context (set by middleware)
	operation, ok := c.Locals("operation").(*db.Operation)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid operation type in context",
		})
	}

	// Get the operation type from the route parameter
	operationType := c.Params("operation")

	ctx := c.Context()

	// Initialize the MySQL client
	mysqlClient, dbName, err := mysqlclient.InitMySQLClient(ctx, cs.Logger, operation)
	if err != nil {
		cs.Logger.ErrorContext(ctx, "Failed to initialize MySQL client",
			"error", err,
			"operation_id", operation.ID)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to connect to MySQL database",
		})
	}
	defer mysqlClient.Close()

	// Get schema information based on operation type
	var schema interface{}

	switch operationType {
	case "pull":
		schema, err = cs.getPullSchema(ctx, mysqlClient)
	case "push":
		schema, err = cs.getPushSchema(ctx, mysqlClient)
	case "patch":
		schema, err = cs.getPatchSchema(ctx, mysqlClient)
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid operation type. Supported types: pull, push, patch",
		})
	}

	if err != nil {
		cs.Logger.ErrorContext(ctx, "Failed to get schema",
			"error", err,
			"operation_type", operationType,
			"database", dbName)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve schema information",
		})
	}

	return c.Status(fiber.StatusOK).JSON(schema)
}

// getPullSchema returns schema information for pull operations.
func (cs *Controllers) getPullSchema(ctx context.Context, mysqlClient *mysqlclient.MySQLClient) (interface{}, error) {
	tablesAndStructures, err := mysqlClient.GetTablesAndStructures(ctx)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"operation": "pull",
		"tables":    tablesAndStructures,
	}, nil
}

// getPushSchema returns schema information for push operations.
func (cs *Controllers) getPushSchema(ctx context.Context, mysqlClient *mysqlclient.MySQLClient) (interface{}, error) {
	tablesAndStructures, err := mysqlClient.GetTablesAndStructures(ctx)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"operation": "push",
		"tables":    tablesAndStructures,
	}, nil
}

// getPatchSchema returns schema information for patch operations.
func (cs *Controllers) getPatchSchema(ctx context.Context, mysqlClient *mysqlclient.MySQLClient) (interface{}, error) {
	tablesAndStructures, err := mysqlClient.GetTablesAndStructures(ctx)
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"operation": "patch",
		"tables":    tablesAndStructures,
	}, nil
}
