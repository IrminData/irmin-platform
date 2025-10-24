package postgrescontrollers

import (
	"encoding/json"
	"errors"
	"fmt"
	"irmin-connectors/connectors/common"
	postgresclient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/db"
	"log/slog"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5"
)

// PostgresPullProvider implements the PullOperationProvider interface for PostgreSQL.
type PostgresPullProvider struct {
	databaseName *string
}

// InitializeClient initializes the PostgreSQL client for pull operations.
func (p *PostgresPullProvider) InitializeClient(
	c fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	client, databaseName, err := postgresclient.InitPostgresClient(c, logger, operation)
	if err != nil {
		return nil, nil, func() {}, err
	}

	// Store database name for use in path processing
	p.databaseName = databaseName

	cleanup := func() {
		client.Close()
	}

	return client, databaseName, cleanup, nil
}

// GetAllFiles retrieves all tables as JSON files.
func (p *PostgresPullProvider) GetAllFiles(c fiber.Ctx, client any) ([]string, [][]byte, error) {
	postgresClient, ok := client.(*postgresclient.PostgresClient)
	if !ok {
		return nil, nil, errors.New("invalid client type for PostgreSQL pull provider")
	}

	// Get list of tables
	tables, err := postgresClient.GetTables(c)
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
func (p *PostgresPullProvider) GetFileByPath(c fiber.Ctx, client any, rawPath string) (string, []byte, error) {
	postgresClient, ok := client.(*postgresclient.PostgresClient)
	if !ok {
		return "", nil, errors.New("invalid client type for PostgreSQL pull provider")
	}

	// Database-specific path processing with proper database name
	path := processRawPath(rawPath, p.databaseName)

	// Create file name
	fileName := fmt.Sprintf("%s.json", path)

	// Query table data
	query := fmt.Sprintf(`SELECT * FROM "%s"`, path)
	rows, err := postgresClient.Query(c, query)
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

// OperationPull godoc
// @Summary Pull data from PostgreSQL database
// @Description Extract data from PostgreSQL database tables using the operation token and specified path (table name)
// @Tags postgres
// @Security OperationTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param path formData string true "Table name to extract data from"
// @Success 200 {object} fiber.Map "Data pulled successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token or table name"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Table not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /postgres/operation/pull [post]
func (cs *Controllers) OperationPull(c fiber.Ctx) error {
	provider := &PostgresPullProvider{}
	return common.HandleOperationPull(c, provider, cs.Logger, cs.DB)
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
