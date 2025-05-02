package postgresControllers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	postgresClient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/lib"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// OperationSchemaGet retrieves the database schema and returns
// an Irmin-compatible ObjectSchema grouping each table as a JSON array.
//
// It expects an operation token in the form, and on success writes
// a JSON response with Content-Type: application/json.
func OperationSchemaGet(w http.ResponseWriter, r *http.Request) {
	// validate token
	valid, _, operation := lib.ValidateOperationToken(defaultConnectorInfo.Name, w, r)
	if !valid {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	ctx := context.Background()

	// initialise Postgres client
	client, dbName, err := postgresClient.InitPostgresClient(ctx, operation)
	if err != nil || client == nil || dbName == nil {
		http.Error(w, "Failed to initialise Postgres client: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer client.Close()

	// list tables
	tables, err := client.GetTables(ctx)
	if err != nil {
		http.Error(w, "Failed to fetch tables: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// build a child ObjectSchema for each table
	children := make([]irminModels.ObjectSchema, 0, len(tables))
	for _, tbl := range tables {
		cols, err := client.GetTableStructure(ctx, tbl)
		if err != nil {
			http.Error(w,
				fmt.Sprintf("Failed to fetch structure for table '%s': %v", tbl, err),
				http.StatusInternalServerError,
			)
			return
		}

		// map each column to a JSONSchema property
		props := make(map[string]irminModels.JSONSchema, len(cols))
		required := []string{}
		for _, col := range cols {
			props[col.ColumnName] = irminModels.JSONSchema{
				Type: col.DataType, // ideally map PG types → JSON Schema types
			}
			if !col.IsNullable {
				required = append(required, col.ColumnName)
			}
		}

		// row object schema
		rowSchema := irminModels.JSONSchema{
			Type:       "object",
			Properties: props,
			Required:   required,
		}

		// table array schema
		arraySchema := irminModels.JSONSchema{
			Type:  "array",
			Items: &rowSchema,
		}

		ct := "application/json"
		children = append(children, irminModels.ObjectSchema{
			Name:        tbl + ".json",
			Path:        *dbName + "/" + tbl + ".json",
			Type:        irminModels.ObjectTypeStructured,
			ContentType: &ct,
			Schema:      &arraySchema,
		})
	}

	// assemble group schema
	group := irminModels.ObjectSchema{
		Type: irminModels.ObjectTypeGroup,
		Name: *dbName,
		Path: *dbName,
		Restrictions: &irminModels.GroupSchemaRestrictions{
			OnlyStructured: func(b bool) *bool { return &b }(true),
		},
		Children: children,
	}

	// write JSON response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(group); err != nil {
		http.Error(w, "Failed to encode schema: "+err.Error(), http.StatusInternalServerError)
	}
}
