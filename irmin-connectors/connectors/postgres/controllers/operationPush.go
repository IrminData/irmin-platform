package postgrescontrollers

import (
	"context"
	"crypto/rand"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	postgresclient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/connectors/postgres/config"
	"irmin-connectors/lib"
	"irmin-connectors/utils"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgconn"
)

func (cs *Controllers) OperationPush(c fiber.Ctx) error {
	// Make sure the request is authorized by validating the operation token
	info := config.GetConnectorInfo()
	tokenValid, _, operation := lib.ValidateOperationToken(cs.DB, cs.Logger, c, info.Name)
	if !tokenValid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// get target table name from path field
	fields, err := utils.ParseFormFields(c, []string{"path"}, nil)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid form data: " + err.Error(),
		})
	}
	_, tableName, _, _ := utils.ExtractPathComponents(fields["path"])
	if tableName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "no table name specified in path",
		})
	}

	// read uploaded JSON file
	fileHeader, err := c.FormFile("file")
	if err != nil {
		if errors.Is(err, http.ErrMissingFile) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "failed to retrieve form file: " + err.Error(),
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to retrieve form file: " + err.Error(),
		})
	}
	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to open form file: " + err.Error(),
		})
	}
	defer file.Close()

	bytesData, err := io.ReadAll(file)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to read uploaded file: " + err.Error(),
		})
	}

	// unmarshal into slice of records
	var records []map[string]any
	if err = json.Unmarshal(bytesData, &records); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "failed to parse JSON data: " + err.Error(),
		})
	}

	// initialise Postgres client
	ctx := c.Context()
	client, _, err := postgresclient.InitPostgresClient(ctx, cs.Logger, operation)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to initialise Postgres client: " + err.Error(),
		})
	}
	defer client.Close()

	// determine and sort column names
	var columns []string
	if len(records) > 0 {
		for col := range records[0] {
			columns = append(columns, col)
		}
		sort.Strings(columns)
	}

	// build INSERT statement
	insertSQL := buildInsertStatement(tableName, columns)

	// execute transaction
	err = executeTransaction(ctx, client, tableName, records, columns, insertSQL)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to execute transaction: " + err.Error(),
		})
	}

	// success
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": fmt.Sprintf("Replaced %d rows in '%s'.", len(records), tableName),
	})
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

// executeDelete executes the DELETE operation within a transaction.
func executeDelete(ctx context.Context, tx *postgresclient.Tx, tableName string) error {
	if _, err := tx.Exec(ctx, fmt.Sprintf(`DELETE FROM "%s"`, tableName)); err != nil {
		return fmt.Errorf("failed to delete rows: %w", err)
	}
	return nil
}

// executeInserts executes the INSERT operations within a transaction.
func executeInserts(
	ctx context.Context,
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
		if _, err := tx.Exec(ctx, insertSQL, args...); err != nil {
			return fmt.Errorf("failed to insert row: %w", err)
		}
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
	err = executeInserts(ctx, tx, records, columns, insertSQL)
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

// executeTransaction executes the delete+insert transaction with retries.
func executeTransaction(
	ctx context.Context,
	client *postgresclient.PostgresClient,
	tableName string,
	records []map[string]any,
	columns []string,
	insertSQL string,
) error {
	var lastErr error
	for attempt := 1; attempt <= utils.MaxRetries; attempt++ {
		err := executeTransactionStep(ctx, client, tableName, records, columns, insertSQL)
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

// quoteIdentifiers wraps each identifier in double quotes to prevent SQL injection.
//
// cols is a slice of unquoted column names, out is a new slice where each name is quoted.
func quoteIdentifiers(cols []string) []string {
	out := make([]string, len(cols))
	for i, c := range cols {
		out[i] = fmt.Sprintf(`"%s"`, c)
	}
	return out
}
