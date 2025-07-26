package mysqlcontrollers

import (
	"errors"
	"fmt"
	"log/slog"

	"irmin-connectors/connectors/common"
	mysqlclient "irmin-connectors/connectors/mysql/client"
	"irmin-connectors/connectors/mysql/config"
	"irmin-connectors/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// MySQLSchemaProvider implements the SchemaOperationProvider interface for MySQL databases.
type MySQLSchemaProvider struct{}

// InitializeClient initializes the MySQL client for schema operations.
func (p *MySQLSchemaProvider) InitializeClient(
	c fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	client, dbName, err := mysqlclient.InitMySQLClient(c, logger, operation)
	if err != nil {
		return nil, nil, func() {}, err
	}
	return client, dbName, func() {
		if closeErr := client.Close(); closeErr != nil {
			logger.Error("failed to close MySQL client", "error", closeErr)
		}
	}, nil
}

// GetSchema retrieves the MySQL database schema and returns an Irmin-compatible ObjectSchema.
func (p *MySQLSchemaProvider) GetSchema(
	c fiber.Ctx,
	client any,
	_ string,
	databaseName *string,
) (*irminmodels.ObjectSchema, error) {
	mysqlClient, ok := client.(*mysqlclient.MySQLClient)
	if !ok {
		return nil, errors.New("invalid client type for MySQL")
	}

	// List tables
	tables, err := mysqlClient.GetTables(c)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch tables: %w", err)
	}

	// Build a child ObjectSchema for each table
	children := make([]irminmodels.ObjectSchema, 0, len(tables))
	for _, tbl := range tables {
		cols, colErr := mysqlClient.GetTableStructure(c, tbl)
		if colErr != nil {
			return nil, fmt.Errorf("failed to fetch structure for table '%s': %w", tbl, colErr)
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
			Path:        *databaseName + "/" + tbl + ".json",
			Type:        irminmodels.ObjectTypeStructured,
			ContentType: &ct,
			Schema:      &arraySchema,
		})
	}

	// Assemble group schema
	group := irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeGroup,
		Name: *databaseName,
		Path: *databaseName,
		Restrictions: &irminmodels.GroupSchemaRestrictions{
			OnlyStructured: func(b bool) *bool { return &b }(true),
		},
		Children: children,
	}

	return &group, nil
}

// GetSupportedOperationTypes returns the list of supported operation types for MySQL.
func (p *MySQLSchemaProvider) GetSupportedOperationTypes() []string {
	return common.CapabilitiesToOperationTypes(config.GetConnectorInfo().Capabilities)
}

// OperationSchemaGet retrieves the database schema and returns
// an Irmin-compatible ObjectSchema grouping each table as a JSON array.
//
// It expects an operation token in the form, and on success writes
// a JSON response with Content-Type: application/json.
func (cs *Controllers) OperationSchemaGet(c fiber.Ctx) error {
	provider := &MySQLSchemaProvider{}
	return common.HandleOperationSchemaGet(c, provider, cs.Logger)
}
