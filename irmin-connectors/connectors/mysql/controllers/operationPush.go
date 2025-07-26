package mysqlcontrollers

import (
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
}

// InitializeClient initializes the MySQL client for push operations.
func (p *MySQLPushProvider) InitializeClient(
	c fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	client, databaseName, err := mysqlclient.InitMySQLClient(c, logger, operation)
	if err != nil {
		return nil, nil, func() {}, fmt.Errorf("failed to initialise MySQL client: %w", err)
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

// ProcessFiles processes the extracted files and inserts them into MySQL tables.
func (p *MySQLPushProvider) ProcessFiles(
	c fiber.Ctx,
	client any,
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
	tables, err := mysqlClient.GetTables(c)
	if err != nil {
		return fmt.Errorf("failed to fetch tables: %w", err)
	}

	// Process each file
	keys := make([]string, 0, len(files))
	for k := range files {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	for _, filePath := range keys {
		tableName := processTableName(filePath, nil) // databaseName not needed here

		// Skip if we're targeting a specific path and this isn't it
		if targetPath != "" && tableName != targetPath {
			continue
		}

		err = processTableData(c, mysqlClient, tableName, files[filePath], tables)
		if err != nil {
			return fmt.Errorf("failed to process table data: %w", err)
		}
	}

	return nil
}

// OperationPush handles the "push" operation using the common framework.
func (cs *Controllers) OperationPush(c fiber.Ctx) error {
	provider := &MySQLPushProvider{}
	return common.HandleOperationPush(c, provider, cs.Logger)
}

// processTableData processes a single table's data and executes the database operations.
func processTableData(
	c fiber.Ctx,
	client *mysqlclient.MySQLClient,
	tableName string,
	fileData []byte,
	tables []string,
) error {
	if !slices.Contains(tables, tableName) {
		// Table doesn't exist, skip it
		return nil
	}

	var records []map[string]any
	if err := json.Unmarshal(fileData, &records); err != nil {
		return fmt.Errorf("failed to parse JSON data: %w", err)
	}

	if len(records) == 0 {
		return nil
	}

	columns := getSortedColumns(records[0])
	insertSQL := buildInsertStatement(tableName, columns)

	return executeTransaction(c, client, tableName, records, columns, insertSQL)
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
func executeDelete(c fiber.Ctx, tx *mysqlclient.Tx, tableName string) error {
	// First try TRUNCATE
	if _, truncateErr := tx.Exec(c, fmt.Sprintf("TRUNCATE TABLE %s", escapeIdentifier(tableName))); truncateErr != nil {
		// If TRUNCATE fails, fall back to DELETE
		if _, deleteErr := tx.Exec(c, fmt.Sprintf("DELETE FROM %s", escapeIdentifier(tableName))); deleteErr != nil {
			return fmt.Errorf("failed to delete/truncate rows: %w", deleteErr)
		}
	}
	return nil
}

// executeInserts executes the INSERT operations within a transaction.
func executeInserts(
	c fiber.Ctx,
	tx *mysqlclient.Tx,
	records []map[string]any,
	columns []string,
	insertSQL string,
) error {
	for _, record := range records {
		args := make([]any, len(columns))
		for i, col := range columns {
			args[i] = record[col]
		}
		if _, err := tx.Exec(c, insertSQL, args...); err != nil {
			return fmt.Errorf("failed to insert row: %w", err)
		}
	}
	return nil
}

// executeTransactionStep executes a single attempt of the transaction.
func executeTransactionStep(
	c fiber.Ctx,
	client *mysqlclient.MySQLClient,
	tableName string,
	records []map[string]any,
	columns []string,
	insertSQL string,
) error {
	tx, err := client.BeginTransaction(c)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	// defer all constraints until commit
	if _, err = tx.Exec(c, "SET FOREIGN_KEY_CHECKS = 0"); err != nil {
		// best-effort, continue even if this fails
		_ = err
	}

	// delete existing rows
	err = executeDelete(c, tx, tableName)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			// Log the rollback error but don't return it
			_ = rollbackErr
		}
		return err
	}

	// insert each new record
	err = executeInserts(c, tx, records, columns, insertSQL)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			// Log the rollback error but don't return it
			_ = rollbackErr
		}
		return err
	}

	// enable foreign key checks again before commit
	if _, err = tx.Exec(c, "SET FOREIGN_KEY_CHECKS = 1"); err != nil {
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

// executeTransaction executes the delete+insert transaction with retries.
func executeTransaction(
	c fiber.Ctx,
	client *mysqlclient.MySQLClient,
	tableName string,
	records []map[string]any,
	columns []string,
	insertSQL string,
) error {
	var lastErr error
	for attempt := 1; attempt <= utils.MaxRetries; attempt++ {
		err := executeTransactionStep(c, client, tableName, records, columns, insertSQL)
		if err == nil {
			return nil
		}

		lastErr = err
		var mysqlErr *mysql.MySQLError
		if errors.As(err, &mysqlErr) && mysqlErr.Number == 1213 && attempt < utils.MaxRetries {
			backoff()
			continue
		}
		return err
	}

	return fmt.Errorf("operation failed after retries due to deadlocks: %w", lastErr)
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
