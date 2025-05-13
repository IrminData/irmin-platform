package postgrescontrollers

import (
	"context"
	"encoding/json"
	"fmt"

	postgresclient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/connectors/postgres/config"
	"irmin-connectors/lib"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// OperationSchemaGet retrieves the database schema and returns
// an Irmin-compatible ObjectSchema grouping each table as a JSON array.
//
// It expects an operation token in the form, and on success writes
// a JSON response with Content-Type: application/json.
func (cs *Controllers) OperationSchemaGet(c fiber.Ctx) error {
	// Make sure the request is authorized by validating the operation token
	info := config.GetConnectorInfo()
	valid, _, operation := lib.ValidateOperationToken(cs.DB, cs.Logger, c, info.Name)
	if !valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	ctx := context.Background()

	// initialise Postgres client
	client, dbName, err := postgresclient.InitPostgresClient(ctx, cs.Logger, operation)
	if err != nil || client == nil || dbName == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialise Postgres client: " + err.Error(),
		})
	}
	defer client.Close()

	// list tables
	tables, err := client.GetTables(ctx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch tables: " + err.Error(),
		})
	}

	// build a child ObjectSchema for each table
	children := make([]irminmodels.ObjectSchema, 0, len(tables))
	for _, tbl := range tables {
		var cols []postgresclient.ColumnInfo
		cols, err = client.GetTableStructure(ctx, tbl)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": fmt.Sprintf("Failed to fetch structure for table '%s': %v", tbl, err),
			})
		}

		// map each column to a JSONSchema property
		props := make(map[string]irminmodels.JSONSchema, len(cols))
		required := []string{}
		for _, col := range cols {
			props[col.ColumnName] = irminmodels.JSONSchema{
				Type: col.DataType, // ideally map PG types → JSON Schema types
			}
			if !col.IsNullable {
				required = append(required, col.ColumnName)
			}
		}

		// row object schema
		rowSchema := irminmodels.JSONSchema{
			Type:       "object",
			Properties: props,
			Required:   required,
		}

		// table array schema
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

	// assemble group schema
	group := irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeGroup,
		Name: *dbName,
		Path: *dbName,
		Restrictions: &irminmodels.GroupSchemaRestrictions{
			OnlyStructured: func(b bool) *bool { return &b }(true),
		},
		Children: children,
	}

	// write JSON response
	c.Set("Content-Type", "application/json")
	if err = json.NewEncoder(c.Response().BodyWriter()).Encode(group); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to encode schema: " + err.Error(),
		})
	}
	return nil
}
