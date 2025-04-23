package postgresControllers

import (
	"context"
	"encoding/json"
	"net/http"

	postgresClient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/lib"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func OperationSchemaGet(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the operation token
	tokenValid, _, operation := lib.ValidateOperationToken(defaultConnectorInfo.Name, w, r)
	if !tokenValid {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Prepare a context for database operations
	ctx := context.Background()

	// Initialise the Postgres client
	dbClient, database, err := postgresClient.InitPostgresClient(ctx, operation)
	if err != nil || database == nil || dbClient == nil {
		http.Error(w, "Failed to initialize Postgres client: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer dbClient.Close() // Close the client at the end of the function

	// Get list of tables in the database
	tables, err := dbClient.GetTables(ctx)
	if err != nil {
		http.Error(w, "Failed to fetch tables: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Fetch structure for each table
	tableStructures := make(map[string][]postgresClient.ColumnInfo)
	for _, tbl := range tables {
		structure, err := dbClient.GetTableStructure(ctx, tbl)
		if err != nil {
			http.Error(w, "Failed to fetch structure for table '"+tbl+"': "+err.Error(), http.StatusInternalServerError)
			return
		}
		tableStructures[tbl] = structure
	}

	// Build an Irmin-compatible schema object
	schemaRestrictions := irminModels.GroupSchemaRestrictions{
		OnlyStructured: func(b bool) *bool { return &b }(true),
	}
	schema := irminModels.ObjectSchema{
		Type:         irminModels.ObjectSchemaTypeGroup,
		Name:         *database,
		Path:         "/" + *database,
		Restrictions: &schemaRestrictions,
		Children:     []irminModels.ObjectSchema{},
	}

	// Convert each table structure to a JSONSchema and append to schema children
	for tbl, structure := range tableStructures {
		rowSchema := irminModels.JSONSchema{
			Type:       "object",
			Properties: map[string]irminModels.JSONSchema{},
			Required:   []string{},
		}

		// Populate rowSchema properties
		for _, column := range structure {
			rowSchema.Properties[column.ColumnName] = irminModels.JSONSchema{
				// In a real-world scenario, map the Postgres data type to a valid JSON Schema type (e.g. "string", "number")
				Type: column.DataType,
			}
			if !column.IsNullable {
				rowSchema.Required = append(rowSchema.Required, column.ColumnName)
			}
		}

		// Each table is represented as an array of row objects
		contentType := "application/json"
		tableJsonSchema := irminModels.JSONSchema{
			Type:  "array",
			Items: &rowSchema,
		}
		tableSchema := irminModels.ObjectSchema{
			Name:        tbl + ".json",
			Path:        "/" + *database + "/" + tbl + ".json",
			Type:        irminModels.ObjectSchemaTypeStructured,
			ContentType: &contentType,
			Schema:      &tableJsonSchema,
		}

		schema.Children = append(schema.Children, tableSchema)
	}

	// Respond with the final Irmin-compatible schema
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(schema); err != nil {
		http.Error(w, "Failed to encode schema to JSON: "+err.Error(), http.StatusInternalServerError)
		return
	}
}
