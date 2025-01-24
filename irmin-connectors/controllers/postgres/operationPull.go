package postgresControllers

import (
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	postgresClient "irmin-connectors/controllers/postgres/client"
	"irmin-connectors/utils"
)

func OperationPull(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the operation token
	if !utils.ValidateOperationToken(defaultConnectorInfo.Name, w, r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Prepare a context for database operations
	ctx := context.Background()

	// Initialise the Postgres client
	dbClient, database, err := postgresClient.InitPostgresClient(ctx, r)
	if err != nil || database == nil || dbClient == nil {
		http.Error(w, "Failed to initialize Postgres client: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer dbClient.Close() // Close the client at the end of the function

	// Parse the form data
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form data: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Extract the path
	path := r.FormValue("path")
	path = strings.TrimSpace(path)
	if len(path) > 0 {
		// Remove leading slash
		if path[0] == '/' {
			path = path[1:]
		}
		// Remove trailing slash
		if len(path) > 0 && path[len(path)-1] == '/' {
			path = path[:len(path)-1]
		}
		// Remove the database name prefix if present
		if len(path) >= len(*database) && path[:len(*database)] == *database {
			path = path[len(*database):]
			if len(path) > 0 && path[0] == '/' {
				path = path[1:]
			}
		}
		// Remove .json suffix if present
		path = strings.TrimSuffix(path, ".json")
	}

	// If path is empty or just "/", or matches the database name with no sub-path,
	// we treat this as the root and return all tables in a multipart response.
	if path == "" || path == "/" {
		returnAllTablesAsMultipart(ctx, w, dbClient)
		return
	}

	// Otherwise, fetch data from the specified table
	fetchSingleTable(ctx, w, dbClient, path)
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
	rows, err := dbClient.Query(ctx, fmt.Sprintf("SELECT * FROM %s", tableName))
	if err != nil {
		return fmt.Errorf("failed to query table '%s': %w", tableName, err)
	}

	// Marshal rows into JSON
	jsonData, err := json.Marshal(rows)
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
	data, err := dbClient.Query(ctx, fmt.Sprintf("SELECT * FROM %s", tableName))
	if err != nil {
		http.Error(w, "Failed to fetch data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Marshal the data to JSON
	jsonData, err := json.Marshal(data)
	if err != nil {
		http.Error(w, "Failed to marshal data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Write the JSON data as a single file download
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.json"`, tableName))
	_, _ = w.Write(jsonData)
}
