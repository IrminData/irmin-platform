package mysqlcontrollers

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-connectors/connectors/common"
	mysqlclient "irmin-connectors/connectors/mysql/client"
	"irmin-connectors/db"
	"log/slog"

	"github.com/gofiber/fiber/v3"
)

// MySQLPullProvider implements the PullOperationProvider interface for MySQL.
type MySQLPullProvider struct {
	databaseName *string
}

// InitializeClient initializes the MySQL client for pull operations.
func (p *MySQLPullProvider) InitializeClient(
	c fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	client, databaseName, err := mysqlclient.InitMySQLClient(c, logger, operation)
	if err != nil {
		return nil, nil, func() {}, err
	}

	// Store database name for use in path processing
	p.databaseName = databaseName

	cleanup := func() {
		if closeErr := client.Close(); closeErr != nil {
			logger.Error("Failed to close MySQL client", "error", closeErr)
		}
	}

	return client, databaseName, cleanup, nil
}

// GetAllFiles retrieves all tables as JSON files.
func (p *MySQLPullProvider) GetAllFiles(c fiber.Ctx, client any) ([]string, [][]byte, error) {
	mysqlClient, ok := client.(*mysqlclient.MySQLClient)
	if !ok {
		return nil, nil, errors.New("invalid client type for MySQL pull provider")
	}

	// Get list of tables
	tables, err := mysqlClient.GetTables(c)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get tables: %w", err)
	}

	// Initialize lists
	filenames := make([]string, len(tables))
	contents := make([][]byte, len(tables))

	// Process each table
	for i, table := range tables {
		resultPath, resultContent, getErr := p.GetFileByPath(c, client, table)
		if getErr != nil {
			return nil, nil, fmt.Errorf("failed to process table %s: %w", table, getErr)
		}
		filenames[i] = resultPath
		contents[i] = resultContent
	}

	return filenames, contents, nil
}

// GetFileByPath retrieves a specific table as a JSON file.
func (p *MySQLPullProvider) GetFileByPath(c fiber.Ctx, client any, rawPath string) (string, []byte, error) {
	mysqlClient, ok := client.(*mysqlclient.MySQLClient)
	if !ok {
		return "", nil, errors.New("invalid client type for MySQL pull provider")
	}

	// Database-specific path processing with proper database name
	path := processRawPath(rawPath, p.databaseName)

	// Create file name
	fileName := fmt.Sprintf("%s.json", path)

	// Query table data
	query := fmt.Sprintf("SELECT * FROM %s", escapeIdentifier(path))
	rows, err := mysqlClient.Query(c, query)
	if err != nil {
		return fileName, nil, fmt.Errorf("query failed: %w", err)
	}
	defer rows.Close()

	// Get column names
	cols, err := rows.Columns()
	if err != nil {
		return fileName, nil, fmt.Errorf("failed to get columns: %w", err)
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

// OperationPull handles the "pull" operation using the common framework.
func (cs *Controllers) OperationPull(c fiber.Ctx) error {
	provider := &MySQLPullProvider{}
	return common.HandleOperationPull(c, provider, cs.Logger)
}

// buildRecordsFromRows converts rows into a slice of maps.
func buildRecordsFromRows(rows *sql.Rows, cols []string) ([]map[string]any, error) {
	var recs []map[string]any
	for rows.Next() {
		values := make([]any, len(cols))
		valuePtrs := make([]any, len(cols))
		for i := range cols {
			valuePtrs[i] = &values[i]
		}

		if err := rows.Scan(valuePtrs...); err != nil {
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
