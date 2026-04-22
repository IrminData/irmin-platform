package postgrescontrollers

import (
	"encoding/json"
	"errors"
	"fmt"
	"irmin-connectors/connectors/common"
	postgresclient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/db"
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5"
)

// PostgresPullProvider implements the PullOperationProvider interface for PostgreSQL.
type PostgresPullProvider struct {
	databaseName *string
	dbInstance   *db.Database
	logger       *slog.Logger
}

// ProgressHandler returns the per-row-batch observability callback
// that Postgres' row-scan loop fires from inside buildRecordsFromRows.
// Without it, a 10M-row table pull emits zero events between
// operation/init and the final response — same silent-window
// failure mode Stripe got fixed for, but worse since SQL scans can
// run 30+ minutes.
//
// Always returns a non-nil handler. Nil-safety lives one layer down
// in common.LogOperationProgress.
//
// Throttling lives in common.ThrottledQueryEmitter at the call site
// (every 1000 rows OR every 5s) — Query is unthrottled in
// LogOperationProgress so callers control their own granularity,
// since "every page" doesn't translate cleanly to row scans.
func (p *PostgresPullProvider) ProgressHandler(operation *db.Operation) common.ProgressHandler {
	return common.NewProgressHandler(p.dbInstance, p.logger, operation)
}

// queryProgressMinRows is the row-count gate for Postgres /
// MySQL row-scan progress emission — emit at most one log row per
// 1000 scanned. Scans on big tables (10M+ rows) would otherwise
// emit 10k+ log rows.
const queryProgressMinRows = 1000

// queryProgressMinInterval is the wall-clock gate paired with
// queryProgressMinRows. Tables with very wide rows (think TOAST'd
// JSON) might scan slowly enough that 1000 rows takes minutes — the
// time gate means operators still see progress in that window.
const queryProgressMinInterval = 5 * time.Second

// resourcePathForTable formats the postgres://<db>/<table>
// identifier used in progress events. Operators seeing the log row
// know which table inside which database is being scanned.
// Package-level so both pull and push providers share one
// implementation; the inputs (databaseName + table) are all that's
// needed to compute the path.
func resourcePathForTable(databaseName *string, table string) string {
	dbName := ""
	if databaseName != nil {
		dbName = *databaseName
	}
	return "postgres://" + dbName + "/" + table
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

	operation, _ := c.Locals("operation").(*db.Operation)

	// Get list of tables
	tables, err := postgresClient.GetTables(c)
	if err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to get PostgreSQL tables list",
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
			"Retrieved PostgreSQL tables list",
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
					"Failed to process PostgreSQL table",
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
func (p *PostgresPullProvider) GetFileByPath(c fiber.Ctx, client any, rawPath string) (string, []byte, error) {
	postgresClient, ok := client.(*postgresclient.PostgresClient)
	if !ok {
		return "", nil, errors.New("invalid client type for PostgreSQL pull provider")
	}

	operation, _ := c.Locals("operation").(*db.Operation)

	// Database-specific path processing with proper database name
	path := processRawPath(rawPath, p.databaseName)

	// Create file name
	fileName := fmt.Sprintf("%s.json", path)

	// Query table data
	query := fmt.Sprintf(`SELECT * FROM "%s"`, path)
	rows, err := postgresClient.Query(c, query)
	if err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"PostgreSQL table query failed",
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
	descs := rows.FieldDescriptions()
	cols := make([]string, len(descs))
	for i, fd := range descs {
		cols[i] = fd.Name
	}

	// Build records
	emit := common.ThrottledQueryEmitter(
		p.ProgressHandler(operation),
		resourcePathForTable(p.databaseName, path),
		queryProgressMinRows,
		queryProgressMinInterval,
	)
	recs, err := buildRecordsFromRows(rows, cols, emit)
	if err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to build records from PostgreSQL table",
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
				"Failed to marshal PostgreSQL table data to JSON",
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
			"Successfully pulled PostgreSQL table data",
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
	provider := &PostgresPullProvider{
		dbInstance: cs.DB,
		logger:     cs.Logger,
	}
	return common.HandleOperationPull(c, provider, cs.Logger, cs.DB)
}

// buildRecordsFromRows converts rows into a slice of maps and fires
// onProgress with the running row count after each scan. Pass a
// no-op closure (or use common.ThrottledQueryEmitter, which returns
// one for nil handlers) to disable progress emission.
func buildRecordsFromRows(rows pgx.Rows, cols []string, onProgress func(int64)) ([]map[string]any, error) {
	var recs []map[string]any
	var scanned int64
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
		scanned++
		onProgress(scanned)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate failed: %w", err)
	}

	return recs, nil
}
