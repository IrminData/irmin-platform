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
	dbInstance   *db.Database
	logger       *slog.Logger
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

	operation, _ := c.Locals("operation").(*db.Operation)

	// Get list of tables
	tables, err := mysqlClient.GetTables(c)
	if err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to get MySQL tables list",
				map[string]any{
					"error":    err.Error(),
					"database": p.databaseName,
				},
			)
		}
		return nil, nil, fmt.Errorf("failed to get tables: %w", err)
	}

	if operation != nil && p.dbInstance != nil && p.logger != nil {
		common.LogOperationEvent(
			p.dbInstance,
			p.logger,
			operation.ID,
			db.LogEventTypeInfo,
			"Retrieved MySQL tables list",
			map[string]any{
				"table_count": len(tables),
				"database":    p.databaseName,
			},
		)
	}

	// Initialize lists
	filenames := make([]string, len(tables))
	contents := make([][]byte, len(tables))

	// Process each table
	for i, table := range tables {
		resultPath, resultContent, getErr := p.GetFileByPath(c, client, table)
		if getErr != nil {
			if operation != nil && p.dbInstance != nil && p.logger != nil {
				common.LogOperationEvent(
					p.dbInstance,
					p.logger,
					operation.ID,
					db.LogEventTypeError,
					"Failed to process MySQL table",
					map[string]any{
						"error":    getErr.Error(),
						"table":    table,
						"database": p.databaseName,
					},
				)
			}
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

	operation, _ := c.Locals("operation").(*db.Operation)

	// Database-specific path processing with proper database name
	path := processRawPath(rawPath, p.databaseName)

	// Create file name
	fileName := fmt.Sprintf("%s.json", path)

	// Query table data
	query := fmt.Sprintf("SELECT * FROM %s", escapeIdentifier(path))
	rows, err := mysqlClient.Query(c, query)
	if err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"MySQL table query failed",
				map[string]any{
					"error":    err.Error(),
					"table":    path,
					"database": p.databaseName,
				},
			)
		}
		return fileName, nil, fmt.Errorf("query failed: %w", err)
	}
	defer rows.Close()

	// Get column names
	cols, err := rows.Columns()
	if err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to get MySQL table columns",
				map[string]any{
					"error":    err.Error(),
					"table":    path,
					"database": p.databaseName,
				},
			)
		}
		return fileName, nil, fmt.Errorf("failed to get columns: %w", err)
	}

	// Build records
	recs, err := buildRecordsFromRows(rows, cols)
	if err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to build records from MySQL table",
				map[string]any{
					"error":    err.Error(),
					"table":    path,
					"database": p.databaseName,
				},
			)
		}
		return fileName, nil, fmt.Errorf("build records failed: %w", err)
	}

	// Marshal and write JSON
	data, err := json.MarshalIndent(recs, "", "  ")
	if err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to marshal MySQL table data to JSON",
				map[string]any{
					"error":    err.Error(),
					"table":    path,
					"database": p.databaseName,
				},
			)
		}
		return fileName, nil, fmt.Errorf("marshal failed: %w", err)
	}

	if operation != nil && p.dbInstance != nil && p.logger != nil {
		common.LogOperationEvent(
			p.dbInstance,
			p.logger,
			operation.ID,
			db.LogEventTypeInfo,
			"Successfully pulled MySQL table data",
			map[string]any{
				"table":        path,
				"database":     p.databaseName,
				"row_count":    len(recs),
				"column_count": len(cols),
			},
		)
	}

	return fileName, data, nil
}

// OperationPull godoc
// @Summary Pull data from MySQL database
// @Description Extract data from MySQL database tables using the operation token and specified path (table name)
// @Tags mysql
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param path formData string true "Table name to extract data from"
// @Success 200 {object} fiber.Map "Data pulled successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token or table name"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Table not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /mysql/operation/pull [post]
func (cs *Controllers) OperationPull(c fiber.Ctx) error {
	provider := &MySQLPullProvider{
		dbInstance: cs.DB,
		logger:     cs.Logger,
	}
	return common.HandleOperationPull(c, provider, cs.Logger, cs.DB)
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
