package postgrescontrollers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	postgresclient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/connectors/postgres/config"
	"irmin-connectors/lib"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// OperationSchemaGet retrieves the database schema and returns
// an Irmin-compatible ObjectSchema grouping each table as a JSON array.
//
// It expects an operation token in the form, and on success writes
// a JSON response with Content-Type: application/json.
func (c *Controller) OperationSchemaGet(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the operation token
	info := config.GetConnectorInfo()
	valid, _, operation := lib.ValidateOperationToken(c.DB, c.Logger, info.Name, w, r)
	if !valid {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	ctx := context.Background()

	// initialise Postgres client
	client, dbName, err := postgresclient.InitPostgresClient(ctx, c.Logger, operation)
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
	children := make([]irminmodels.ObjectSchema, 0, len(tables))
	for _, tbl := range tables {
		var cols []postgresclient.ColumnInfo
		cols, err = client.GetTableStructure(ctx, tbl)
		if err != nil {
			http.Error(w,
				fmt.Sprintf("Failed to fetch structure for table '%s': %v", tbl, err),
				http.StatusInternalServerError,
			)
			return
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
	w.Header().Set("Content-Type", "application/json")
	if err = json.NewEncoder(w).Encode(group); err != nil {
		http.Error(w, "Failed to encode schema: "+err.Error(), http.StatusInternalServerError)
	}
}
