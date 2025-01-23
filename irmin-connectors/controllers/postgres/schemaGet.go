package postgresControllers

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"

	postgresClient "irmin-connectors/controllers/postgres/client"
	"irmin-connectors/utils"

	"github.com/IrminData/irmin-sdk-go/models"
)

func SchemaGet(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the system token
	if !utils.ValidateConnectorSystemToken(defaultConnectorInfo.Name, w, r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Prepare a context for database operations
	ctx := context.Background()

	// Parse the form data
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form data: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Extract fields for "details"
	host := r.FormValue("details[host]")
	portStr := r.FormValue("details[port]")
	user := r.FormValue("details[user]")
	password := r.FormValue("details[password]")

	// Extract fields for "settings"
	database := r.FormValue("settings[database]")

	// Check for missing required fields
	if host == "" || portStr == "" || user == "" || database == "" {
		http.Error(w, "Missing required connection details: host, port, user, or database.", http.StatusBadRequest)
		return
	}

	// Convert port from string to int
	port, err := strconv.Atoi(portStr)
	if err != nil {
		http.Error(w, "Invalid port value: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Establish a connection to the PostgreSQL server
	pgClient, err := postgresClient.NewPostgresClient(host, port, user, password)
	if err != nil {
		http.Error(w, "Failed to connect to PostgreSQL server: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer pgClient.Close()

	// Connect to the specified database
	dbClient, err := pgClient.WithDatabase(database)
	if err != nil {
		http.Error(w, "Failed to connect to PostgreSQL database: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer dbClient.Close()

	// Validate the credentials
	if err := dbClient.ValidateCredentials(ctx); err != nil {
		http.Error(w, "Invalid server credentials or unable to connect: "+err.Error(), http.StatusInternalServerError)
		return
	}

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
	schemaRestrictions := models.GroupSchemaRestrictions{
		OnlyStructured: func(b bool) *bool { return &b }(true),
	}
	schema := models.ObjectSchemaGroup{
		ObjectSchemaBase: models.ObjectSchemaBase{
			Name: database,
			Path: "/" + database,
		},
		Restrictions: &schemaRestrictions,
		Children:     []models.ObjectSchema{},
	}

	// Convert each table structure to a JSONSchema and append to schema children
	for tbl, structure := range tableStructures {
		rowSchema := models.JSONSchema{
			Type:       "object",
			Properties: map[string]models.JSONSchema{},
			Required:   []string{},
		}

		// Populate rowSchema properties
		for _, column := range structure {
			rowSchema.Properties[column.ColumnName] = models.JSONSchema{
				// In a real-world scenario, map the Postgres data type to a valid JSON Schema type (e.g. "string", "number")
				Type: column.DataType,
			}
			if !column.IsNullable {
				rowSchema.Required = append(rowSchema.Required, column.ColumnName)
			}
		}

		// Each table is represented as an array of row objects
		tableSchema := models.ObjectSchemaStructured{
			ObjectSchemaBase: models.ObjectSchemaBase{
				Name: tbl + ".json",
				Path: "/" + database + "/" + tbl + ".json",
			},
			ContentType: func(s string) *string { return &s }("application/json"),
			Schema: models.JSONSchema{
				Type:  "array",
				Items: &rowSchema,
			},
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
