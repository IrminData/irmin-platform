package postgrescontrollers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"mime/multipart"
	"net/textproto"
	"time"

	postgresclient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/connectors/postgres/config"
	"irmin-connectors/lib"
	"irmin-connectors/utils"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5"
)

// OperationPull fetches data from Postgres based on the request path.
// It can return:
// - all tables as a multipart/mixed response,
// - a single table as a JSON attachment,
// - a single row (by "id") as a JSON attachment.
func (cs *Controllers) OperationPull(c fiber.Ctx) error {
	// Make sure the request is authorized by validating the operation token
	info := config.GetConnectorInfo()
	tokenValid, _, operation := lib.ValidateOperationToken(cs.DB, cs.Logger, c, info.Name)
	if !tokenValid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// prepare context and initialise client
	ctx := c.Context()
	client, _, err := postgresclient.InitPostgresClient(ctx, cs.Logger, operation)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialise Postgres client: " + err.Error(),
		})
	}
	defer client.Close()

	// parse "path" field from form
	fields, err := utils.ParseFormFields(c, []string{"path"}, nil)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	path := fields["path"]

	// determine mode by path
	switch {
	case path == "" || path == "/":
		// return every table
		return fetchAllTablesMultipart(c, client)
	case func() bool {
		_, table, rowID, _ := utils.ExtractPathComponents(path)
		return table != "" && rowID != ""
	}():
		_, table, rowID, _ := utils.ExtractPathComponents(path)
		return fetchRowByID(c, client, table, rowID)
	case func() bool {
		_, table, _, _ := utils.ExtractPathComponents(path)
		return table != ""
	}():
		_, table, _, _ := utils.ExtractPathComponents(path)
		return fetchFullTable(c, client, table)
	default:
		// invalid path
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid path: " + path,
		})
	}
}

// fetchAllTablesMultipart writes every table in "public" as JSON parts
// in a multipart/mixed response.
func fetchAllTablesMultipart(
	c fiber.Ctx,
	client *postgresclient.PostgresClient,
) error {
	ctx := c.Context()

	// Get list of tables
	tables, err := client.GetTables(ctx)
	if err != nil {
		return fmt.Errorf("failed to get tables: %w", err)
	}

	// Setup multipart writer
	boundary := fmt.Sprintf("MULTIPART-%d", time.Now().UnixNano())
	c.Set("Content-Type", "multipart/mixed; boundary="+boundary)

	mw := multipart.NewWriter(c)
	if boundaryErr := mw.SetBoundary(boundary); boundaryErr != nil {
		return fmt.Errorf("failed to set boundary: %w", boundaryErr)
	}
	defer mw.Close()

	// Process each table
	for _, table := range tables {
		if tableErr := writeTableAsPart(ctx, mw, client, table); tableErr != nil {
			return fmt.Errorf("failed to process table %s: %w", table, tableErr)
		}
	}

	return nil
}

// writeTableAsPart writes a single table as a multipart part.
func writeTableAsPart(
	ctx context.Context,
	mw *multipart.Writer,
	client *postgresclient.PostgresClient,
	table string,
) error {
	// Create part with headers
	h := textproto.MIMEHeader{}
	h.Set("Content-Type", "application/octet-stream")
	h.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.json"`, table))

	part, err := mw.CreatePart(h)
	if err != nil {
		return fmt.Errorf("create part failed: %w", err)
	}

	// Query table data
	query := fmt.Sprintf(`SELECT * FROM "%s"`, table)
	rows, err := client.Query(ctx, query)
	if err != nil {
		return fmt.Errorf("query failed: %w", err)
	}
	defer rows.Close()

	// Get column names
	descs := rows.FieldDescriptions()
	cols := make([]string, len(descs))
	for i, fd := range descs {
		cols[i] = fd.Name
	}

	// Build records
	recs, err := buildRecordsFromRows(rows, cols)
	if err != nil {
		return fmt.Errorf("build records failed: %w", err)
	}

	// Marshal and write JSON
	data, err := json.MarshalIndent(recs, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal failed: %w", err)
	}

	if _, writeErr := part.Write(data); writeErr != nil {
		return fmt.Errorf("write JSON failed: %w", writeErr)
	}

	return nil
}

// buildRecordsFromRows converts rows into a slice of maps.
func buildRecordsFromRows(rows pgx.Rows, cols []string) ([]map[string]any, error) {
	var recs []map[string]any
	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return nil, fmt.Errorf("scan values failed: %w", err)
		}

		row := make(map[string]any, len(cols))
		for i, col := range cols {
			row[col] = values[i]
		}
		recs = append(recs, row)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate failed: %w", err)
	}

	return recs, nil
}

// fetchFullTable queries an entire table and returns it as a JSON download.
func fetchFullTable(
	c fiber.Ctx,
	client *postgresclient.PostgresClient,
	table string,
) error {
	ctx := c.Context()
	query := fmt.Sprintf(`SELECT * FROM "%s"`, table)
	rows, err := client.Query(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to fetch table %s: %w", table, err)
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
			return fmt.Errorf("failed to retrieve values: %w", err)
		}
		row := make(map[string]any, len(cols))
		for i, col := range cols {
			row[col] = values[i]
		}
		recs = append(recs, row)
	}
	if err = rows.Err(); err != nil {
		return fmt.Errorf("failed to iterate rows: %w", err)
	}

	// Send the JSON response
	c.Set("Content-Type", "application/octet-stream")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s.json"`, table))
	return c.JSON(recs)
}

// fetchRowByID queries one row by "id" and returns it as a JSON download.
func fetchRowByID(
	c fiber.Ctx,
	client *postgresclient.PostgresClient,
	table, id string,
) error {
	ctx := c.Context()
	query := fmt.Sprintf(`SELECT * FROM "%s" WHERE "id" = $1`, table)
	rows, err := client.Query(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to fetch row: %w", err)
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
			return fmt.Errorf("failed to retrieve values: %w", err)
		}
		row := make(map[string]any, len(cols))
		for i, col := range cols {
			row[col] = values[i]
		}
		recs = append(recs, row)
	}
	if err = rows.Err(); err != nil {
		return fmt.Errorf("failed to iterate rows: %w", err)
	}
	if len(recs) == 0 {
		return errors.New("no row found")
	}

	// send as attachment
	filename := fmt.Sprintf(`%s_row_%s.json`, table, id)
	c.Set("Content-Type", "application/octet-stream")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	return c.JSON(recs[0])
}
