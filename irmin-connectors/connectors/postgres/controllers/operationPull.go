package postgrescontrollers

import (
	"context"
	"encoding/json"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/textproto"
	"time"

	postgresclient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/connectors/postgres/config"
	"irmin-connectors/lib"
	"irmin-connectors/utils"
)

// OperationPull fetches data from Postgres based on the request path.
// It can return:
// - all tables as a multipart/mixed response,
// - a single table as a JSON attachment,
// - a single row (by "id") as a JSON attachment.
func (c *Controller) OperationPull(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the operation token
	info := config.GetConnectorInfo()
	tokenValid, _, operation := lib.ValidateOperationToken(c.DB, c.Logger, info.Name, w, r)
	if !tokenValid {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// prepare context and initialise client
	ctx := context.Background()
	client, _, err := postgresclient.InitPostgresClient(ctx, c.Logger, operation)
	if err != nil {
		http.Error(w, "Failed to initialise Postgres client: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer client.Close()

	// parse "path" field from form
	fields, err := utils.ParseFormFields(r, []string{"path"}, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	path := fields["path"]

	// determine mode by path
	switch {
	case path == "" || path == "/":
		// return every table
		returnAllTablesMultipart(ctx, w, client)
	case func() bool {
		_, table, rowID, _ := utils.ExtractPathComponents(path)
		return table != "" && rowID != ""
	}():
		_, table, rowID, _ := utils.ExtractPathComponents(path)
		fetchRowByID(ctx, w, client, table, rowID)
	case func() bool {
		_, table, _, _ := utils.ExtractPathComponents(path)
		return table != ""
	}():
		_, table, _, _ := utils.ExtractPathComponents(path)
		fetchFullTable(ctx, w, client, table)
	default:
		// invalid path
		http.Error(w, "Invalid path: "+path, http.StatusBadRequest)
	}
}

// returnAllTablesMultipart writes every table in "public" as JSON parts
// in a multipart/mixed response.
func returnAllTablesMultipart(
	ctx context.Context,
	w http.ResponseWriter,
	client *postgresclient.PostgresClient,
) {
	// list tables
	tables, err := client.GetTables(ctx)
	if err != nil {
		http.Error(w, "Failed to fetch table list: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// prepare multipart writer
	boundary := fmt.Sprintf("MULTIPART-%d", time.Now().UnixNano())
	w.Header().Set("Content-Type", "multipart/mixed; boundary="+boundary)

	mw := multipart.NewWriter(w)
	if boundaryErr := mw.SetBoundary(boundary); boundaryErr != nil {
		http.Error(w, "Failed to set multipart boundary: "+boundaryErr.Error(), http.StatusInternalServerError)
		return
	}
	defer mw.Close()

	// write each table as JSON attachment
	for _, tbl := range tables {
		if err = writeTablePart(ctx, mw, client, tbl); err != nil {
			http.Error(w, fmt.Sprintf("Failed to process table %s: %v", tbl, err), http.StatusInternalServerError)
			return
		}
	}
}

// writeTablePart queries a table and writes its rows as JSON to one part.
func writeTablePart(
	ctx context.Context,
	mw *multipart.Writer,
	client *postgresclient.PostgresClient,
	table string,
) error {
	// prepare MIME headers
	h := textproto.MIMEHeader{}
	h.Set("Content-Type", "application/octet-stream")
	h.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.json"`, table))

	part, err := mw.CreatePart(h)
	if err != nil {
		return fmt.Errorf("create part for %s failed: %w", table, err)
	}

	// fetch rows
	query := fmt.Sprintf(`SELECT * FROM "%s"`, table)
	rows, err := client.Query(ctx, query)
	if err != nil {
		return fmt.Errorf("query %s failed: %w", table, err)
	}
	defer rows.Close()

	// extract column names
	descs := rows.FieldDescriptions()
	cols := make([]string, len(descs))
	for i, fd := range descs {
		cols[i] = fd.Name
	}

	// build record slice
	var recs []map[string]any
	for rows.Next() {
		var values []any
		values, err = rows.Values()
		if err != nil {
			return fmt.Errorf("scan values for %s failed: %w", table, err)
		}
		row := make(map[string]any, len(cols))
		for i, col := range cols {
			row[col] = values[i]
		}
		recs = append(recs, row)
	}
	if err = rows.Err(); err != nil {
		return fmt.Errorf("iterate %s failed: %w", table, err)
	}

	// marshal and write JSON
	data, err := json.MarshalIndent(recs, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal %s failed: %w", table, err)
	}
	if _, err = part.Write(data); err != nil {
		return fmt.Errorf("write JSON for %s failed: %w", table, err)
	}

	return nil
}

// fetchFullTable queries an entire table and returns it as a JSON download.
func fetchFullTable(
	ctx context.Context,
	w http.ResponseWriter,
	client *postgresclient.PostgresClient,
	table string,
) {
	query := fmt.Sprintf(`SELECT * FROM "%s"`, table)
	rows, err := client.Query(ctx, query)
	if err != nil {
		http.Error(w, "Failed to fetch table "+table+": "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// extract column names
	descs := rows.FieldDescriptions()
	cols := make([]string, len(descs))
	for i, fd := range descs {
		cols[i] = fd.Name
	}

	// build record slice
	var recs []map[string]any
	for rows.Next() {
		var values []any
		values, err = rows.Values()
		if err != nil {
			http.Error(w, "Failed to retrieve values: "+err.Error(), http.StatusInternalServerError)
			return
		}
		row := make(map[string]any, len(cols))
		for i, col := range cols {
			row[col] = values[i]
		}
		recs = append(recs, row)
	}
	if err = rows.Err(); err != nil {
		http.Error(w, "Failed to iterate rows: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// marshal JSON
	data, err := json.MarshalIndent(recs, "", "  ")
	if err != nil {
		http.Error(w, "Failed to marshal data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// send as attachment
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.json"`, table))
	if _, writeErr := w.Write(data); writeErr != nil {
		http.Error(w, "Failed to write response: "+writeErr.Error(), http.StatusInternalServerError)
		return
	}
}

// fetchRowByID queries one row by "id" and returns it as a JSON download.
func fetchRowByID(
	ctx context.Context,
	w http.ResponseWriter,
	client *postgresclient.PostgresClient,
	table, id string,
) {
	query := fmt.Sprintf(`SELECT * FROM "%s" WHERE "id" = $1`, table)
	rows, err := client.Query(ctx, query, id)
	if err != nil {
		http.Error(w, "Failed to fetch row: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// extract column names
	descs := rows.FieldDescriptions()
	cols := make([]string, len(descs))
	for i, fd := range descs {
		cols[i] = fd.Name
	}

	// build record slice (expecting at most one)
	var recs []map[string]any
	for rows.Next() {
		var values []any
		values, err = rows.Values()
		if err != nil {
			http.Error(w, "Failed to retrieve values: "+err.Error(), http.StatusInternalServerError)
			return
		}
		row := make(map[string]any, len(cols))
		for i, col := range cols {
			row[col] = values[i]
		}
		recs = append(recs, row)
	}
	if err = rows.Err(); err != nil {
		http.Error(w, "Failed to iterate rows: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if len(recs) == 0 {
		http.Error(w, "No row found", http.StatusNotFound)
		return
	}

	// marshal JSON
	data, err := json.MarshalIndent(recs[0], "", "  ")
	if err != nil {
		http.Error(w, "Failed to marshal data: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// send as attachment
	filename := fmt.Sprintf(`%s_row_%s.json`, table, id)
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	if _, writeErr := w.Write(data); writeErr != nil {
		http.Error(w, "Failed to write response: "+writeErr.Error(), http.StatusInternalServerError)
		return
	}
}
