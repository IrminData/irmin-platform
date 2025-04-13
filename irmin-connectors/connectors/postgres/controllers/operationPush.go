package postgresControllers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	postgresClient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/lib"
	"irmin-connectors/utils"
)

// OperationPush receives data for a specific table as a JSON file and replaces all rows in that table.
func OperationPush(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the operation token
	tokenValid, _, operation := lib.ValidateOperationToken(defaultConnectorInfo.Name, w, r)
	if !tokenValid {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse the form data (including file uploads)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		http.Error(w, "Invalid form data: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Prepare a context for database operations
	ctx := context.Background()

	// Initialise the Postgres client
	dbClient, database, err := postgresClient.InitPostgresClient(ctx, operation)
	if err != nil || database == nil || dbClient == nil {
		http.Error(w, "Failed to initialise Postgres client: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer dbClient.Close()

	// Get the form values from the request
	fields, err := utils.ParseFormFields(r, []string{"path"}, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, tableName, _, _ := utils.ExtractPathComponents(fields["path"])

	// If no table name was provided, error out
	if tableName == "" {
		http.Error(w, "No table name specified in path", http.StatusBadRequest)
		return
	}

	// Retrieve the file from the form
	file, _, err := r.FormFile("file")
	if err == http.ErrMissingFile {
		http.Error(w, "No file uploaded with form field 'file'", http.StatusBadRequest)
		return
	}
	if err != nil {
		http.Error(w, "Failed to retrieve form file: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer file.Close()

	// Read the entire file into memory
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Failed to read uploaded file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Unmarshal the JSON into a slice of maps
	var records []map[string]any
	if err := json.Unmarshal(fileBytes, &records); err != nil {
		http.Error(w, "Failed to parse JSON data: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Start a transaction to ensure either all rows are replaced or none
	tx, err := dbClient.BeginTransaction(ctx)
	if err != nil {
		http.Error(w, "Failed to begin transaction: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx) // Rollback if not committed

	// Truncate the table to remove all existing rows
	truncateSQL := fmt.Sprintf(`TRUNCATE TABLE "%s" RESTART IDENTITY CASCADE`, tableName)
	if _, err := tx.Exec(ctx, truncateSQL); err != nil {
		http.Error(w, "Failed to truncate table: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// If there is no data to insert, commit and return success
	if len(records) == 0 {
		if err := tx.Commit(ctx); err != nil {
			http.Error(w, "Failed to commit transaction: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Table truncated. No rows inserted."))
		return
	}

	// Build a list of columns from the first record
	// (Production code should reconcile with actual table schema and handle errors if columns don't match)
	var columns []string
	for col := range records[0] {
		columns = append(columns, col)
	}

	// Build an INSERT statement dynamically
	// e.g. INSERT INTO "table" (col1, col2, ...) VALUES ($1, $2, ...)
	colsPlaceholder := make([]string, len(columns))
	for i := range columns {
		colsPlaceholder[i] = fmt.Sprintf("$%d", i+1)
	}
	insertSQL := fmt.Sprintf(`INSERT INTO "%s" (%s) VALUES (%s)`,
		tableName,
		strings.Join(quoteIdentifiers(columns), ", "),
		strings.Join(colsPlaceholder, ", "),
	)

	// Insert each record
	for _, rec := range records {
		args := make([]any, len(columns))
		for i, col := range columns {
			args[i] = rec[col]
		}
		if _, err := tx.Exec(ctx, insertSQL, args...); err != nil {
			http.Error(w, "Failed to insert row: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// Commit the transaction
	if err := tx.Commit(ctx); err != nil {
		http.Error(w, "Failed to commit transaction: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(fmt.Sprintf("Successfully replaced rows in table '%s'.", tableName)))
}

// quoteIdentifiers safely quotes column names for inclusion in SQL statements.
func quoteIdentifiers(cols []string) []string {
	quoted := make([]string, len(cols))
	for i, c := range cols {
		quoted[i] = fmt.Sprintf(`"%s"`, c)
	}
	return quoted
}
