package mysqlcontrollers

import (
	"encoding/json"
	"fmt"

	mysqlclient "irmin-connectors/connectors/mysql/client"
	"irmin-connectors/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// OperationSchemaGet retrieves the database schema and returns
// an Irmin-compatible ObjectSchema grouping each table as a JSON array.
//
// It expects an operation token in the form, and on success writes
// a JSON response with Content-Type: application/json.
func (cs *Controllers) OperationSchemaGet(c fiber.Ctx) error {
	// Get the operation from the context
	operation, ok := c.Locals("operation").(*db.Operation)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid operation type in context",
		})
	}

	// Get the operation type from the URL parameter
	operationType := c.Params("operation")
	if operationType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Operation type is required",
		})
	}

	// Validate operation type
	switch operationType {
	case "pull", "push", "patch":
		// Valid operation types
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid operation type. Supported types: pull, push, patch",
		})
	}

	// Get the context
	ctx := c.Context()

	// Initialise MySQL client
	client, dbName, err := mysqlclient.InitMySQLClient(ctx, cs.Logger, operation)
	if err != nil || client == nil || dbName == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialise MySQL client: " + err.Error(),
		})
	}
	defer client.Close()

	// List tables
	tables, err := client.GetTables(ctx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch tables: " + err.Error(),
		})
	}

	// Build a child ObjectSchema for each table
	children := make([]irminmodels.ObjectSchema, 0, len(tables))
	for _, tbl := range tables {
		var cols []mysqlclient.ColumnInfo
		cols, err = client.GetTableStructure(ctx, tbl)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": fmt.Sprintf("Failed to fetch structure for table '%s': %v", tbl, err),
			})
		}

		// Map each column to a JSONSchema property
		props := make(map[string]irminmodels.JSONSchema, len(cols))
		required := []string{}
		for _, col := range cols {
			props[col.ColumnName] = irminmodels.JSONSchema{
				Type: col.DataType, // ideally map MySQL types → JSON Schema types
			}
			if !col.IsNullable {
				required = append(required, col.ColumnName)
			}
		}

		// Row object schema
		rowSchema := irminmodels.JSONSchema{
			Type:       "object",
			Properties: props,
			Required:   required,
		}

		// Table array schema
		arraySchema := irminmodels.JSONSchema{
			Type:  "array",
			Items: &rowSchema,
		}

		ct := "application/json"
		children = append(children, irminmodels.ObjectSchema{
			Name:        tbl + ".json",
			Path:        *dbName + "/" + tbl + ".json",
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: &ct,
			Schema:      &arraySchema,
		})
	}

	// Assemble group schema
	group := irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeGroup,
		Name: *dbName,
		Path: *dbName,
		Restrictions: &irminmodels.GroupSchemaRestrictions{
			OnlyStructured: func(b bool) *bool { return &b }(true),
		},
		Children: children,
	}

	// Write JSON response
	c.Set("Content-Type", "application/json")
	if err = json.NewEncoder(c.Response().BodyWriter()).Encode(group); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to encode schema: " + err.Error(),
		})
	}
	return nil
}
