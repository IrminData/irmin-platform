package postgresControllers

import (
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"time"

	postgresClient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/utils"
)

func OperationPull(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the operation token
	tokenValid, _, operation := utils.ValidateOperationToken(defaultConnectorInfo.Name, w, r)
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

	// Get the form values from the request
	fields, err := utils.ParseRequiredFormFields(r, []string{"path"})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// If path is empty or just "/", or matches the database name with no sub-path,
	// we treat this as the root and return all tables in a multipart response.
	if fields["path"] == "" || fields["path"] == "/" {
		returnAllTablesAsMultipart(ctx, w, dbClient)
		return
	}

	// If the path is not empty, get the details of the path
	_, tableName, rowIdentifier, _ := utils.ExtractPathComponents(fields["path"])

	if tableName != "" && rowIdentifier != "" {
		// If both table name and row identifier are present, fetch a single row
		fetchSingleRow(ctx, w, dbClient, tableName, rowIdentifier)
		return
	}
	if tableName != "" {
		// If only the table name is present, fetch the entire table
		fetchSingleTable(ctx, w, dbClient, tableName)
		return
	}
}

func returnAllTablesAsMultipart(ctx context.Context, w http.ResponseWriter, dbClient *postgresClient.PostgresClient) {
	// Use the provided client method to retrieve a list of tables in 'public'.
	tables, err := dbClient.GetTables(ctx)
	if err != nil {
		http.Error(w, "Failed to fetch table list: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Create a boundary for our multipart
	boundary := fmt.Sprintf("MULTIPARTBOUNDARY-%d", time.Now().UnixNano())

	// Set headers for the multipart response
	w.Header().Set("Content-Type", "multipart/mixed; boundary="+boundary)

	multipartWriter := multipart.NewWriter(w)
	// Make sure we use the same boundary (multipart.NewWriter generates a default otherwise)
	multipartWriter.SetBoundary(boundary)

	// Iterate over the tables and create a part for each
	for _, tableName := range tables {
		err := writeTableAsPart(ctx, multipartWriter, dbClient, tableName)
		if err != nil {
			http.Error(w, fmt.Sprintf("Failed to process table %s: %v", tableName, err), http.StatusInternalServerError)
			return
		}
	}

	// Close the writer to finalise the multipart message
	if err := multipartWriter.Close(); err != nil {
		http.Error(w, "Failed to close multipart writer: "+err.Error(), http.StatusInternalServerError)
	}
}

func writeTableAsPart(ctx context.Context, mw *multipart.Writer, dbClient *postgresClient.PostgresClient, tableName string) error {
	// Prepare a part header
	header := make(map[string][]string)
	header["Content-Type"] = []string{"application/octet-stream"}
	header["Content-Disposition"] = []string{fmt.Sprintf(`attachment; filename="%s.json"`, tableName)}

	part, err := mw.CreatePart(header)
	if err != nil {
		return fmt.Errorf("CreatePart failed: %w", err)
	}

	// Query all rows from the specified table
	query := fmt.Sprintf(`SELECT * FROM "%s"`, tableName)
	rows, err := dbClient.Query(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to query table '%s': %w", tableName, err)
	}
	defer rows.Close()

	// Collect the rows into a struct
	var results []map[string]interface{}

	// Get column names
	fieldDescriptions := rows.FieldDescriptions()
	columns := make([]string, len(fieldDescriptions))
	for i, fd := range fieldDescriptions {
		columns[i] = string(fd.Name)
	}

	// Iterate through the rows and build records
	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return fmt.Errorf("failed to retrieve values from table '%s': %w", tableName, err)
		}

		record := make(map[string]interface{})
		for i, col := range columns {
			record[col] = values[i]
		}

		results = append(results, record)
	}

	if rows.Err() != nil {
		return fmt.Errorf("failed to iterate through rows for table '%s': %w", tableName, rows.Err())
	}

	// Marshal rows into JSON
	jsonData, err := json.MarshalIndent(results, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal data from table '%s': %w", tableName, err)
	}

	// Write the JSON data to the part
	_, err = part.Write(jsonData)
	if err != nil {
		return fmt.Errorf("failed to write JSON data for table '%s': %w", tableName, err)
	}

	return nil
}

func fetchSingleTable(ctx context.Context, w http.ResponseWriter, dbClient *postgresClient.PostgresClient, tableName string) {
	// Fetch the data from the database based on the table name
	query := fmt.Sprintf(`SELECT * FROM "%s"`, tableName)
	rows, err := dbClient.Query(ctx, query)
	if err != nil {
		http.Error(w, "Failed to fetch data: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Collect the rows into a struct
	var results []map[string]interface{}

	// Get column names
	fieldDescriptions := rows.FieldDescriptions()
	columns := make([]string, len(fieldDescriptions))
	for i, fd := range fieldDescriptions {
		columns[i] = string(fd.Name)
	}

	// Iterate through the rows and build records
	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			http.Error(w, "Failed to retrieve values: "+err.Error(), http.StatusInternalServerError)
			return
		}

		record := make(map[string]interface{})
		for i, col := range columns {
			record[col] = values[i]
		}

		results = append(results, record)
	}

	if rows.Err() != nil {
		http.Error(w, "Failed to iterate through rows: "+rows.Err().Error(), http.StatusInternalServerError)
		return
	}

	// Marshal the data to JSON
	jsonData, err := json.MarshalIndent(results, "", "  ")
	if err != nil {
		http.Error(w, "Failed to marshal data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Write the JSON data as a single file download
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.json"`, tableName))
	_, _ = w.Write(jsonData)
}

func fetchSingleRow(ctx context.Context, w http.ResponseWriter, dbClient *postgresClient.PostgresClient, tableName, rowID string) {
	// Construct a query to select the entire row by "id".
	query := fmt.Sprintf(`SELECT * FROM "%s" WHERE "id" = $1`, tableName)
	rows, err := dbClient.Query(ctx, query, rowID)
	if err != nil {
		http.Error(w, "Failed to fetch data: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Collect column names
	fieldDescriptions := rows.FieldDescriptions()
	columns := make([]string, len(fieldDescriptions))
	for i, fd := range fieldDescriptions {
		columns[i] = string(fd.Name)
	}

	// We only expect one row (or none). Build a map to hold the data.
	var result map[string]interface{}

	if rows.Next() {
		values, err := rows.Values()
		if err != nil {
			http.Error(w, "Failed to retrieve values: "+err.Error(), http.StatusInternalServerError)
			return
		}

		record := make(map[string]interface{})
		for i, col := range columns {
			record[col] = values[i]
		}
		result = record
	}

	// Check if any error occurred during iteration
	if rows.Err() != nil {
		http.Error(w, "Failed to iterate through rows: "+rows.Err().Error(), http.StatusInternalServerError)
		return
	}

	// If result is nil, it means no row was found
	if result == nil {
		http.Error(w, "No row found", http.StatusNotFound)
		return
	}

	// Marshal the row into JSON
	jsonData, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		http.Error(w, "Failed to marshal data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Write the JSON data as a file download
	fileName := fmt.Sprintf("%s_row_%s.json", tableName, rowID)
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, fileName))
	_, _ = w.Write(jsonData)
}
