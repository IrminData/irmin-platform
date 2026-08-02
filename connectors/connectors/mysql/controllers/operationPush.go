package mysqlcontrollers

import (
	"context"
	"crypto/rand"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-connectors/connectors/common"
	mysqlclient "irmin-connectors/connectors/mysql/client"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"log/slog"
	"slices"
	"sort"
	"strings"
	"time"

	"github.com/go-sql-driver/mysql"
	"github.com/gofiber/fiber/v3"
)

// MySQLPushProvider implements the PushOperationProvider interface for MySQL.
type MySQLPushProvider struct {
	databaseName *string
	dbInstance   *db.Database
	logger       *slog.Logger
}

// ProgressHandler returns the per-row-batch observability callback
// MySQL's single-row INSERT loop fires from inside executeInserts.
// A million-row push without progress emission looks identical to a
// hung connection until COMMIT — same field-incident shape Stripe
// got fixed for.
//
// Always returns a non-nil handler. Nil-safety lives one layer down
// in common.LogOperationProgress.
//
// Throttling lives in common.ThrottledQueryEmitter at the call site.
func (p *MySQLPushProvider) ProgressHandler(operation *db.Operation) common.ProgressHandler {
	return common.NewProgressHandler(p.dbInstance, p.logger, operation)
}

// InitializeClient initializes the MySQL client for push operations.
func (p *MySQLPushProvider) InitializeClient(
	ctx context.Context,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	client, databaseName, err := mysqlclient.InitMySQLClient(ctx, logger, operation)
	if err != nil {
		return nil, nil, func() {}, fmt.Errorf("failed to initialise MySQL client: %w", err)
	}

	// Store database name for use in path processing
	p.databaseName = databaseName

	cleanup := func() {
		if closeErr := client.Close(); closeErr != nil {
			logger.ErrorContext(ctx, "Failed to close MySQL client", "error", closeErr)
		}
	}

	return client, databaseName, cleanup, nil
}

// ProcessFiles processes the extracted files and inserts them into MySQL tables.
func (p *MySQLPushProvider) ProcessFiles(
	ctx context.Context,
	client any,
	operation *db.Operation,
	files map[string][]byte,
	rawPath string,
) error {
	mysqlClient, ok := client.(*mysqlclient.MySQLClient)
	if !ok {
		return errors.New("invalid client type for MySQL push provider")
	}

	// Use the existing database-specific path processing utility with proper database name
	targetPath := processRawPath(rawPath, p.databaseName)

	// Get available tables
	tables, err := mysqlClient.GetTables(ctx)
	if err != nil {
		if operation != nil && p.dbInstance != nil && p.logger != nil {
			common.LogOperationEvent(
				p.dbInstance,
				p.logger,
				operation.ID,
				db.LogEventTypeError,
				"Failed to get MySQL tables list for push operation",
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

		err = p.processTableDataWithLogging(ctx, mysqlClient, tableName, files[filePath], tables, operation)
		if err != nil {
			return fmt.Errorf("failed to process table data: %w", err)
		}
	}

	return nil
}

// OperationPush godoc
// @Summary Push data to MySQL database
// @Description Insert data into MySQL database tables using the operation token and JSON file containing table data. Use the path parameter to specify a target table name.
// @Tags mysql
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "JSON file containing table data to insert"
// @Param path formData string false "Target table name (e.g., customers). If not specified, uses the filename from the uploaded file"
// @Success 202 {object} irminmodels.StartOperationJobResponse "Push job accepted; poll /operation/status/:job_id"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token or file format"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 409 {object} irminmodels.AlreadyRunningBody "Operation already running"
// @Failure 500 {object} irminmodels.JobErrorBody "Internal server error"
// @Router /mysql/operation/push [post]
func (cs *Controllers) OperationPush(c fiber.Ctx) error {
	provider := &MySQLPushProvider{
		dbInstance: cs.DB,
		logger:     cs.Logger,
	}
	return common.HandleOperationPush(c, provider, cs.Logger, cs.DB, cs.App)
}

// processTableDataWithLogging is a wrapper around processTableData that adds logging.
func (p *MySQLPushProvider) processTableDataWithLogging(
	ctx context.Context,
	client *mysqlclient.MySQLClient,
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
				"Skipping MySQL table that doesn't exist",
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
				"Failed to parse JSON data for MySQL table",
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
				"Skipping empty MySQL table data",
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
			"Processing MySQL table push operation",
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
				"Failed to execute MySQL table push transaction",
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
			"Successfully pushed MySQL table data",
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
func (p *MySQLPushProvider) executeTransactionWithLogging(
	ctx context.Context,
	client *mysqlclient.MySQLClient,
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
		// Build a fresh emitter per attempt — see Postgres' matching
		// fix in the parent PR for the full reasoning. Reusing the
		// emitter across deadlock retries silences progress for the
		// entire retry attempt because the row gate stays closed
		// against stale lastRows state.
		emit := common.ThrottledQueryEmitter(
			handler, resourcePath,
			queryProgressMinRows, queryProgressMinInterval,
		)
		err := executeTransactionStep(ctx, client, tableName, records, columns, insertSQL, emit)
		if err == nil {
			return nil
		}

		lastErr = err
		var mysqlErr *mysql.MySQLError
		if errors.As(err, &mysqlErr) && mysqlErr.Number == 1213 && attempt < utils.MaxRetries {
			if operation != nil && p.dbInstance != nil && p.logger != nil {
				common.LogOperationEvent(
					p.dbInstance,
					p.logger,
					operation.ID,
					db.LogEventTypeWarning,
					"MySQL deadlock detected, retrying transaction",
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
		placeholders[i] = "?"
	}
	return fmt.Sprintf(
		"INSERT INTO %s (%s) VALUES (%s)",
		escapeIdentifier(tableName),
		strings.Join(escapeIdentifiers(columns), ", "),
		strings.Join(placeholders, ", "),
	)
}

// executeDelete executes the DELETE and TRUNCATE operations within a transaction.
func executeDelete(ctx context.Context, tx *mysqlclient.Tx, tableName string) error {
	// First try TRUNCATE
	if _, truncateErr := tx.Exec(ctx, fmt.Sprintf("TRUNCATE TABLE %s", escapeIdentifier(tableName))); truncateErr != nil {
		// If TRUNCATE fails, fall back to DELETE
		if _, deleteErr := tx.Exec(ctx, fmt.Sprintf("DELETE FROM %s", escapeIdentifier(tableName))); deleteErr != nil {
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
	tx *mysqlclient.Tx,
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
	client *mysqlclient.MySQLClient,
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
	if _, err = tx.Exec(ctx, "SET FOREIGN_KEY_CHECKS = 0"); err != nil {
		// best-effort, continue even if this fails
		_ = err
	}

	// delete existing rows
	err = executeDelete(ctx, tx, tableName)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			// Log the rollback error but don't return it
			_ = rollbackErr
		}
		return err
	}

	// insert each new record
	err = executeInserts(ctx, tx, records, columns, insertSQL, onProgress)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			// Log the rollback error but don't return it
			_ = rollbackErr
		}
		return err
	}

	// enable foreign key checks again before commit
	if _, err = tx.Exec(ctx, "SET FOREIGN_KEY_CHECKS = 1"); err != nil {
		// best-effort, continue even if this fails
		_ = err
	}

	// commit transaction
	err = tx.Commit()
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
