package postgrescontrollers

import (
	"errors"
	"fmt"
	"log/slog"

	"irmin-connectors/connectors/common"
	postgresclient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/connectors/postgres/config"
	"irmin-connectors/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// PostgreSQLSchemaProvider implements the SchemaOperationProvider interface for PostgreSQL databases.
type PostgreSQLSchemaProvider struct{}

// InitializeClient initializes the PostgreSQL client for schema operations.
func (p *PostgreSQLSchemaProvider) InitializeClient(
	c fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	client, dbName, err := postgresclient.InitPostgresClient(c, logger, operation)
	if err != nil {
		return nil, nil, func() {}, err
	}
	return client, dbName, func() {
		client.Close()
	}, nil
}

// GetSchema retrieves the PostgreSQL database schema and returns an Irmin-compatible ObjectSchema.
func (p *PostgreSQLSchemaProvider) GetSchema(
	c fiber.Ctx,
	client any,
	_ string, // operationType parameter is not used for PostgreSQL
	databaseName *string, // path parameter in PostgreSQL is used as the database name
) (*irminmodels.ObjectSchema, error) {
	postgresClient, ok := client.(*postgresclient.PostgresClient)
	if !ok {
		return nil, errors.New("invalid client type for PostgreSQL")
	}

	// List tables
	tables, err := postgresClient.GetTables(c)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch tables: %w", err)
	}

	// Build a child ObjectSchema for each table
	children := make([]irminmodels.ObjectSchema, 0, len(tables))
	for _, tbl := range tables {
		cols, colErr := postgresClient.GetTableStructure(c, tbl)
		if colErr != nil {
			return nil, fmt.Errorf("failed to fetch structure for table '%s': %w", tbl, colErr)
		}

		// Map each column to a JSONSchema property
		props := make(map[string]irminmodels.JSONSchema, len(cols))
		required := []string{}
		for _, col := range cols {
			props[col.ColumnName] = irminmodels.JSONSchema{
				Type: col.DataType, // ideally map PostgreSQL types → JSON Schema types
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

// GetSupportedOperationTypes returns the list of supported operation types for PostgreSQL.
func (p *PostgreSQLSchemaProvider) GetSupportedOperationTypes() []string {
	return common.CapabilitiesToOperationTypes(config.GetConnectorInfo().Capabilities)
}

// OperationSchemaGet godoc
// @Summary Get PostgreSQL operation schema
// @Description Get the database schema for PostgreSQL operations, returning an Irmin-compatible ObjectSchema grouping each table as a JSON array based on the operation type (pull or push). Use the path query parameter to specify which database to analyze.
// @Tags postgres
// @Security OperationTokenAuth
// @Accept json
// @Produce json
// @Param operation path string true "Operation type" Enums(pull, push)
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param path query string false "Database name to get schema for (e.g., my_database)"
// @Success 200 {object} irminmodels.ObjectSchema "Operation schema retrieved successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation type or token"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /postgres/operation/schema/{operation} [post]
func (cs *Controllers) OperationSchemaGet(c fiber.Ctx) error {
	provider := &PostgreSQLSchemaProvider{}
	return common.HandleOperationSchemaGet(c, provider, cs.Logger)
}
