package postgrescontrollers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"strings"

	postgresclient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/db"
	"irmin-connectors/utils"

	irminutils "github.com/IrminData/irmin-sdk-go/utils"
	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5"
)

// OperationPull fetches data from Postgres based on the request path.
// It can return:
// - all tables as a multipart/mixed response,
// - a single table as a JSON attachment,
// - a single row (by "id") as a JSON attachment.
func (cs *Controllers) OperationPull(c fiber.Ctx) error {
	// Get the operation from the context
	operation, ok := c.Locals("operation").(*db.Operation)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid operation type in context",
		})
	}

	// prepare context and initialise client
	ctx := c.Context()
	client, databaseName, err := postgresclient.InitPostgresClient(ctx, cs.Logger, operation)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialise Postgres client: " + err.Error(),
		})
	}
	defer client.Close()

	// parse "path" field from form
	fields, err := utils.ParseFormFields(c, nil, []string{"path"})
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	path := strings.TrimSuffix(fields["path"], ".json")
	path = strings.Trim(path, "/")

	// Safe dereference of databaseName pointer
	if databaseName != nil {
		path = strings.TrimPrefix(path, *databaseName)
	}

	path = strings.Trim(path, "/")

	// prepare the object to store the result files
	resultFiles := make(map[string][]byte)

	// determine mode by path
	if path == "" {
		// return every table
		resultPaths, resultContents, getErr := getAllTablesAsFiles(ctx, client)
		if getErr != nil {
			cs.Logger.Error("failed to get all tables", "error", getErr)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to get all tables: " + fields["path"],
			})
		}
		for i, resultPath := range resultPaths {
			resultFiles[resultPath] = resultContents[i]
		}
	} else {
		// return a single table
		resultPath, resultContent, getErr := getTableAsFile(ctx, client, path)
		if getErr != nil {
			cs.Logger.Error("failed to get table", "error", getErr)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to get table: " + path,
			})
		}
		resultFiles[resultPath] = resultContent
	}

	// Create a zip archive of the result files
	zipBytes, err := irminutils.ZipFiles(resultFiles)
	if err != nil {
		cs.Logger.Error("failed to create zip archive", "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create zip archive",
		})
	}

	// return the result files as a zip archive stream
	c.Response().Header.Set("Content-Type", "application/zip")
	c.Response().Header.Set("Content-Disposition", "attachment; filename=result.zip")
	return c.Status(fiber.StatusOK).SendStream(bytes.NewReader(zipBytes))
}

// getAllTablesAsFiles writes every table in "public" as JSON files.
// It returns a list of file paths, the file contents, and an error if one occurs.
func getAllTablesAsFiles(
	ctx context.Context,
	client *postgresclient.PostgresClient,
) ([]string, [][]byte, error) {
	// Get list of tables
	tables, err := client.GetTables(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get tables: %w", err)
	}

	// initialise lists
	filenames := make([]string, len(tables))
	contents := make([][]byte, len(tables))

	// Process each table
	for i, table := range tables {
		resultPath, resultContent, getErr := getTableAsFile(ctx, client, table)
		if getErr != nil {
			return nil, nil, fmt.Errorf("failed to process table %s: %w", table, getErr)
		}
		filenames[i] = resultPath
		contents[i] = resultContent
	}

	return filenames, contents, nil
}

// getTableAsFile creates a JSON file for a given table.
// It returns the file path, the file content, and an error if one occurs.
func getTableAsFile(
	ctx context.Context,
	client *postgresclient.PostgresClient,
	table string,
) (string, []byte, error) {
	// create file name
	fileName := fmt.Sprintf("%s.json", table)

	// Query table data
	query := fmt.Sprintf(`SELECT * FROM "%s"`, table)
	rows, err := client.Query(ctx, query)
	if err != nil {
		return fileName, nil, fmt.Errorf("query failed: %w", err)
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
		return fileName, nil, fmt.Errorf("build records failed: %w", err)
	}

	// Marshal and write JSON
	data, err := json.MarshalIndent(recs, "", "  ")
	if err != nil {
		return fileName, nil, fmt.Errorf("marshal failed: %w", err)
	}

	return fileName, data, nil
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
