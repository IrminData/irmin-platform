package postgrescontrollers

import (
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
}

// InitializeClient initializes the PostgreSQL client for push operations.
func (p *PostgresPushProvider) InitializeClient(
	c fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (any, *string, func(), error) {
	client, databaseName, err := postgresclient.InitPostgresClient(c, logger, operation)
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
	c fiber.Ctx,
	client any,
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
	tables, err := postgresClient.GetTables(c)
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
		tableName := processTableName(filePath, p.databaseName)

		// Skip if we're targeting a specific path and this isn't it
		if targetPath != "" && tableName != targetPath {
			continue
		}

		err = processTableData(c, postgresClient, tableName, files[filePath], tables)
		if err != nil {
			return fmt.Errorf("failed to process table data: %w", err)
		}
	}

	return nil
}

// OperationPush godoc
// @Summary Push data to PostgreSQL database
// @Description Insert data into PostgreSQL database tables using the operation token and JSON file containing table data
// @Tags postgres
// @Security OperationTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param file formData file true "JSON file containing table data to insert"
// @Success 200 {object} fiber.Map "Data pushed successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token or file format"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /postgres/operation/push [post]
func (cs *Controllers) OperationPush(c fiber.Ctx) error {
	provider := &PostgresPushProvider{}
	return common.HandleOperationPush(c, provider, cs.Logger)
}

// processTableData processes a single table's data and executes the database operations.
func processTableData(
	c fiber.Ctx,
	client *postgresclient.PostgresClient,
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
func executeDelete(c fiber.Ctx, tx *postgresclient.Tx, tableName string) error {
	// First try TRUNCATE
	if _, truncateErr := tx.Exec(c, fmt.Sprintf(`TRUNCATE TABLE "%s" CASCADE`, tableName)); truncateErr != nil {
		// If TRUNCATE fails, fall back to DELETE
		if _, deleteErr := tx.Exec(c, fmt.Sprintf(`DELETE FROM "%s"`, tableName)); deleteErr != nil {
			return fmt.Errorf("failed to delete/truncate rows: %w", deleteErr)
		}
	}
	return nil
}

// executeInserts executes the INSERT operations within a transaction.
func executeInserts(
	c fiber.Ctx,
	tx *postgresclient.Tx,
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
	client *postgresclient.PostgresClient,
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
	if _, err = tx.Exec(c, "SET CONSTRAINTS ALL DEFERRED"); err != nil {
		// best-effort, continue even if this fails
		_ = err
	}

	// delete existing rows
	err = executeDelete(c, tx, tableName)
	if err != nil {
		if rollbackErr := tx.Rollback(c); rollbackErr != nil {
			// Log the rollback error but don't return it
			_ = rollbackErr
		}
		return err
	}

	// insert each new record
	err = executeInserts(c, tx, records, columns, insertSQL)
	if err != nil {
		if rollbackErr := tx.Rollback(c); rollbackErr != nil {
			// Log the rollback error but don't return it
			_ = rollbackErr
		}
		return err
	}

	// commit transaction
	err = tx.Commit(c)
	if err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// executeTransaction executes the delete+insert transaction with retries.
func executeTransaction(
	c fiber.Ctx,
	client *postgresclient.PostgresClient,
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
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "40P01" && attempt < utils.MaxRetries {
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
