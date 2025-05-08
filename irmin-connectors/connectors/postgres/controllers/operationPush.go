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
	"log/slog"
	"net/http"
	"sort"
	"strings"
	"time"

	"irmin-connectors/db"

	"github.com/jackc/pgx/v5/pgconn"
)

// validateAndParseRequest validates the request and parses the form data.
func validateAndParseRequest(
	w http.ResponseWriter,
	r *http.Request,
	d *db.Database,
	logger *slog.Logger,
) (string, []map[string]any, interface{}, error) {
	// Make sure the request is authorized by validating the operation token
	info := config.GetConnectorInfo()
	tokenValid, _, operation := lib.ValidateOperationToken(d, logger, info.Name, w, r)
	if !tokenValid {
		return "", nil, nil, errors.New("unauthorized")
	}

	// parse multipart form (up to 32 MB)
	if err := r.ParseMultipartForm(utils.DefaultMultipartFormMemory); err != nil {
		return "", nil, nil, fmt.Errorf("invalid form data: %w", err)
	}

	// get target table name from path field
	fields, err := utils.ParseFormFields(r, []string{"path"}, nil)
	if err != nil {
		return "", nil, nil, err
	}
	_, tableName, _, _ := utils.ExtractPathComponents(fields["path"])
	if tableName == "" {
		return "", nil, nil, errors.New("no table name specified in path")
	}

	// read uploaded JSON file
	file, _, err := r.FormFile("file")
	if err != nil {
		if errors.Is(err, http.ErrMissingFile) {
			return "", nil, nil, fmt.Errorf("failed to retrieve form file: %w", err)
		}
		return "", nil, nil, fmt.Errorf("failed to retrieve form file: %w", err)
	}
	defer file.Close()

	bytesData, err := io.ReadAll(file)
	if err != nil {
		return "", nil, nil, fmt.Errorf("failed to read uploaded file: %w", err)
	}

	// unmarshal into slice of records
	var records []map[string]any
	if err = json.Unmarshal(bytesData, &records); err != nil {
		return "", nil, nil, fmt.Errorf("failed to parse JSON data: %w", err)
	}

	return tableName, records, operation, nil
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
		if isDeadlock(err) && attempt < utils.MaxRetries {
			backoff()
			continue
		}
		return err
	}

	return fmt.Errorf("operation failed after retries due to deadlocks: %w", lastErr)
}

func (c *Controller) OperationPush(w http.ResponseWriter, r *http.Request) {
	// validate request and parse data
	tableName, records, operation, err := validateAndParseRequest(w, r, c.DB, c.Logger)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// initialise Postgres client
	ctx := context.Background()
	op, ok := operation.(*db.Operation)
	if !ok {
		http.Error(w, "Invalid operation type", http.StatusInternalServerError)
		return
	}
	client, _, err := postgresclient.InitPostgresClient(ctx, c.Logger, op)
	if err != nil {
		http.Error(w, "Failed to initialise Postgres client: "+err.Error(), http.StatusInternalServerError)
		return
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
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// success
	w.WriteHeader(http.StatusOK)
	fmt.Fprintf(w, "Replaced %d rows in '%s'.", len(records), tableName)
}

// isDeadlock checks if the error is a Postgres deadlock (SQLSTATE 40P01).
//
// Returns true if err is a *pgconn.PgError with Code == "40P01".
func isDeadlock(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "40P01"
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
