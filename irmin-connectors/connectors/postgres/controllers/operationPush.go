package postgrescontrollers

import (
	"context"
	"crypto/rand"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-connectors/connectors/common"
	postgresclient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"log/slog"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgconn"
)

// PostgresPushProvider implements the PushOperationProvider interface for PostgreSQL.
type PostgresPushProvider struct {
	databaseName *string
	dbInstance   *db.Database
	logger       *slog.Logger
}

// ProgressHandler returns the per-row-batch observability callback
// that Postgres' single-row INSERT loop fires from inside
// executeInserts. A million-row push without progress emission
// looks identical to a hung connection until the final COMMIT —
// same field-incident shape that Stripe got fixed for.
//
// Always returns a non-nil handler. Nil-safety lives one layer down
// in common.LogOperationProgress.
//
// Throttling lives in common.ThrottledQueryEmitter at the call site
// (every 1000 rows OR every 5s).
func (p *PostgresPushProvider) ProgressHandler(operation *db.Operation) common.ProgressHandler {
	return common.NewProgressHandler(p.dbInstance, p.logger, operation)
}

// InitializeClient initializes the PostgreSQL client for push operations.
func (p *PostgresPushProvider) InitializeClient(
	ctx context.Context,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	client, databaseName, err := postgresclient.InitPostgresClient(ctx, logger, operation)
	if err != nil {
		return nil, nil, func() {}, fmt.Errorf("failed to initialise Postgres client: %w", err)
	}

	// Store database name for use in path processing
	p.databaseName = databaseName

	cleanup := func() {
		client.Close()
	}

	return client, databaseName, cleanup, nil
}

// ProcessFiles processes the extracted files and inserts them into PostgreSQL tables.
func (p *PostgresPushProvider) ProcessFiles(
	ctx context.Context,
	client any,
	operation *db.Operation,
	files map[string][]byte,
	rawPath string,
) error {
	postgresClient, ok := client.(*postgresclient.PostgresClient)
	if !ok {
		return errors.New("invalid client type for PostgreSQL push provider")
	}

	// Use the existing database-specific path processing utility with proper database name
	targetPath := processRawPath(rawPath, p.databaseName)

	// Get available tables
	tables, err := postgresClient.GetTables(ctx)
	if err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to get PostgreSQL tables list for push operation",
				map[string]any{
					"error":    err.Error(),
					"database": p.databaseName,
				},
			)
		}
		return fmt.Errorf("failed to fetch tables: %w", err)
	}

	// Process each file
	keys := make([]string, 0, len(files))
	for k := range files {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	for _, filePath := range keys {
		tableName := processTableName(filePath, p.databaseName)

		// Skip if we're targeting a specific path and this isn't it
		if targetPath != "" && tableName != targetPath {
			continue
		}

		err = p.processTableDataWithLogging(ctx, postgresClient, tableName, files[filePath], tables, operation)
		if err != nil {
			return fmt.Errorf("failed to process table data: %w", err)
		}
	}

	return nil
}

// OperationPush godoc
// @Summary Push data to PostgreSQL database
// @Description Insert data into PostgreSQL database tables using the operation token and JSON file containing table data. Use the path parameter to specify a target table name.
// @Tags postgres
// @Security OperationTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param file formData file true "JSON file containing table data to insert"
// @Param path formData string false "Target table name (e.g., customers). If not specified, uses the filename from the uploaded file"
// @Success 202 {object} irminmodels.StartOperationJobResponse "Push job accepted; poll /operation/status/:job_id"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token or file format"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 409 {object} irminmodels.AlreadyRunningBody "Operation already running"
// @Failure 500 {object} irminmodels.JobErrorBody "Internal server error"
// @Router /postgres/operation/push [post]
func (cs *Controllers) OperationPush(c fiber.Ctx) error {
	provider := &PostgresPushProvider{
		dbInstance: cs.DB,
		logger:     cs.Logger,
	}
	return common.HandleOperationPush(c, provider, cs.Logger, cs.DB, cs.App)
}

// processTableDataWithLogging is a wrapper around processTableData that adds logging.
func (p *PostgresPushProvider) processTableDataWithLogging(
	ctx context.Context,
	client *postgresclient.PostgresClient,
	tableName string,
	fileData []byte,
	tables []string,
	operation *db.Operation,
) error {
	if !slices.Contains(tables, tableName) {
		// Table doesn't exist, skip it
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeWarning,
				"Skipping PostgreSQL table that doesn't exist",
				map[string]any{
					"table":    tableName,
					"database": p.databaseName,
				},
			)
		}
		return nil
	}

	var records []map[string]any
	if err := json.Unmarshal(fileData, &records); err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to parse JSON data for PostgreSQL table",
				map[string]any{
					"error":    err.Error(),
					"table":    tableName,
					"database": p.databaseName,
				},
			)
		}
		return fmt.Errorf("failed to parse JSON data: %w", err)
	}

	if len(records) == 0 {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeInfo,
				"Skipping empty PostgreSQL table data",
				map[string]any{
					"table":    tableName,
					"database": p.databaseName,
				},
			)
		}
		return nil
	}

	if operation != nil && p.dbInstance != nil && p.logger != nil {
		common.LogOperationEvent(
			p.dbInstance,
			p.logger,
			operation.ID,
			db.LogEventTypeInfo,
			"Processing PostgreSQL table push operation",
			map[string]any{
				"table":     tableName,
				"database":  p.databaseName,
				"row_count": len(records),
			},
		)
	}

	columns := getSortedColumns(records[0])
	insertSQL := buildInsertStatement(tableName, columns)

	err := p.executeTransactionWithLogging(ctx, client, tableName, records, columns, insertSQL, operation)
	if err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to execute PostgreSQL table push transaction",
				map[string]any{
					"error":     err.Error(),
					"table":     tableName,
					"database":  p.databaseName,
					"row_count": len(records),
				},
			)
		}
		return err
	}

	if operation != nil && p.dbInstance != nil && p.logger != nil {
		common.LogOperationEvent(
			p.dbInstance,
			p.logger,
			operation.ID,
			db.LogEventTypeInfo,
			"Successfully pushed PostgreSQL table data",
			map[string]any{
				"table":        tableName,
				"database":     p.databaseName,
				"row_count":    len(records),
				"column_count": len(columns),
			},
		)
	}

	return nil
}

// executeTransactionWithLogging wraps executeTransaction with logging for retries.
func (p *PostgresPushProvider) executeTransactionWithLogging(
	ctx context.Context,
	client *postgresclient.PostgresClient,
	tableName string,
	records []map[string]any,
	columns []string,
	insertSQL string,
	operation *db.Operation,
) error {
	handler := p.ProgressHandler(operation)
	resourcePath := resourcePathForTable(p.databaseName, tableName)

	var lastErr error
	for attempt := 1; attempt <= utils.MaxRetries; attempt++ {
		// Build a fresh emitter per attempt. executeInserts resets
		// its inserted counter to 0 on each call, but
		// ThrottledQueryEmitter keeps lastRows / lastEmit across
		// invocations. A deadlock retry would then see rows=1
		// against a stale lastRows=4001, the row gate stays closed,
		// and progress goes silent for the entire retry attempt
		// (defeating the whole point of this PR).
		emit := common.ThrottledQueryEmitter(
			handler, resourcePath,
			queryProgressMinRows, queryProgressMinInterval,
		)
		err := executeTransactionStep(ctx, client, tableName, records, columns, insertSQL, emit)
		if err == nil {
			return nil
		}

		lastErr = err
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "40P01" && attempt < utils.MaxRetries {
			if operation != nil && p.dbInstance != nil && p.logger != nil {
				common.LogOperationEvent(
					p.dbInstance,
					p.logger,
					operation.ID,
					db.LogEventTypeWarning,
					"PostgreSQL deadlock detected, retrying transaction",
					map[string]any{
						"table":    tableName,
						"database": p.databaseName,
						"attempt":  attempt,
					},
				)
			}
			backoff()
			continue
		}
		return err
	}

	return fmt.Errorf("operation failed after retries due to deadlocks: %w", lastErr)
}

// getSortedColumns returns a sorted slice of column names from a record.
func getSortedColumns(record map[string]any) []string {
	columns := make([]string, 0, len(record))
	for col := range record {
		columns = append(columns, col)
	}
	sort.Strings(columns)
	return columns
}

// buildInsertStatement builds the INSERT statement with placeholders.
func buildInsertStatement(tableName string, columns []string) string {
	placeholders := make([]string, len(columns))
	for i := range columns {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
	}
	return fmt.Sprintf(
		`INSERT INTO "%s" (%s) VALUES (%s)`,
		tableName,
		strings.Join(quoteIdentifiers(columns), ", "),
		strings.Join(placeholders, ", "),
	)
}

// executeDelete executes the DELETE and TRUNCATE operations within a transaction.
func executeDelete(ctx context.Context, tx *postgresclient.Tx, tableName string) error {
	// First try TRUNCATE
	if _, truncateErr := tx.Exec(ctx, fmt.Sprintf(`TRUNCATE TABLE "%s" CASCADE`, tableName)); truncateErr != nil {
		// If TRUNCATE fails, fall back to DELETE
		if _, deleteErr := tx.Exec(ctx, fmt.Sprintf(`DELETE FROM "%s"`, tableName)); deleteErr != nil {
			return fmt.Errorf("failed to delete/truncate rows: %w", deleteErr)
		}
	}
	return nil
}

// executeInserts executes the INSERT operations within a
// transaction, firing onProgress with the running insert count after
// each row. Pass a no-op closure to disable progress emission (or
// use common.ThrottledQueryEmitter, which returns one for nil
// handlers).
func executeInserts(
	ctx context.Context,
	tx *postgresclient.Tx,
	records []map[string]any,
	columns []string,
	insertSQL string,
	onProgress func(int64),
) error {
	var inserted int64
	for _, record := range records {
		args := make([]any, len(columns))
		for i, col := range columns {
			args[i] = record[col]
		}
		if _, err := tx.Exec(ctx, insertSQL, args...); err != nil {
			return fmt.Errorf("failed to insert row: %w", err)
		}
		inserted++
		onProgress(inserted)
	}
	return nil
}

// executeTransactionStep executes a single attempt of the transaction.
func executeTransactionStep(
	ctx context.Context,
	client *postgresclient.PostgresClient,
	tableName string,
	records []map[string]any,
	columns []string,
	insertSQL string,
	onProgress func(int64),
) error {
	tx, err := client.BeginTransaction(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	// defer all constraints until commit
	if _, err = tx.Exec(ctx, "SET CONSTRAINTS ALL DEFERRED"); err != nil {
		// best-effort, continue even if this fails
		_ = err
	}

	// delete existing rows
	err = executeDelete(ctx, tx, tableName)
	if err != nil {
		if rollbackErr := tx.Rollback(ctx); rollbackErr != nil {
			// Log the rollback error but don't return it
			_ = rollbackErr
		}
		return err
	}

	// insert each new record
	err = executeInserts(ctx, tx, records, columns, insertSQL, onProgress)
	if err != nil {
		if rollbackErr := tx.Rollback(ctx); rollbackErr != nil {
			// Log the rollback error but don't return it
			_ = rollbackErr
		}
		return err
	}

	// commit transaction
	err = tx.Commit(ctx)
	if err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// backoff sleeps for a short, randomised duration before retrying.
func backoff() {
	// Generate a secure random number between 0 and MaxJitter
	var jitter uint32
	if err := binary.Read(rand.Reader, binary.BigEndian, &jitter); err != nil {
		// Fallback to a small fixed delay if random generation fails
		time.Sleep(time.Duration(utils.BaseBackoff) * time.Millisecond)
		return
	}
	jitter %= uint32(utils.MaxJitter)

	// sleep for baseBackoff + [0, maxJitter) milliseconds
	delay := time.Duration(utils.BaseBackoff+int(jitter)) * time.Millisecond
	time.Sleep(delay)
}
