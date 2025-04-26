package postgresControllers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	postgresClient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/lib"
	"irmin-connectors/utils"
	"math/rand"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
)

const (
	// maxRetries defines how many times to retry the transaction on deadlock.
	maxRetries = 3

	// baseBackoff is the minimum jitter wait (in milliseconds) before retrying.
	baseBackoff = 50

	// maxJitter is the additional random backoff (in milliseconds).
	maxJitter = 100
)

// OperationPush replaces *all* rows in the given table with the supplied JSON.
// It uses DELETE + INSERT within a deferred-constraints transaction,
// and retries up to maxRetries in the event of deadlock.
func OperationPush(w http.ResponseWriter, r *http.Request) {
	// validate token
	valid, _, operation := lib.ValidateOperationToken(defaultConnectorInfo.Name, w, r)
	if !valid {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// parse multipart form (up to 32 MB)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		http.Error(w, "Invalid form data: "+err.Error(), http.StatusBadRequest)
		return
	}

	// initialise Postgres client
	ctx := context.Background()
	client, _, err := postgresClient.InitPostgresClient(ctx, operation)
	if err != nil {
		http.Error(w, "Failed to initialise Postgres client: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer client.Close()

	// get target table name from path field
	fields, err := utils.ParseFormFields(r, []string{"path"}, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	_, tableName, _, _ := utils.ExtractPathComponents(fields["path"])
	if tableName == "" {
		http.Error(w, "No table name specified in path", http.StatusBadRequest)
		return
	}

	// read uploaded JSON file
	file, _, err := r.FormFile("file")
	if err != nil {
		status := http.StatusInternalServerError
		if err == http.ErrMissingFile {
			status = http.StatusBadRequest
		}
		http.Error(w, "Failed to retrieve form file: "+err.Error(), status)
		return
	}
	defer file.Close()

	bytesData, err := io.ReadAll(file)
	if err != nil {
		http.Error(w, "Failed to read uploaded file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// unmarshal into slice of records
	var records []map[string]any
	if err := json.Unmarshal(bytesData, &records); err != nil {
		http.Error(w, "Failed to parse JSON data: "+err.Error(), http.StatusBadRequest)
		return
	}

	// determine and sort column names
	var columns []string
	if len(records) > 0 {
		for col := range records[0] {
			columns = append(columns, col)
		}
		sort.Strings(columns)
	}

	// build INSERT statement with placeholders
	placeholders := make([]string, len(columns))
	for i := range columns {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
	}
	insertSQL := fmt.Sprintf(
		`INSERT INTO "%s" (%s) VALUES (%s)`,
		tableName,
		strings.Join(quoteIdentifiers(columns), ", "),
		strings.Join(placeholders, ", "),
	)

	// attempt the delete+insert transaction, retrying on deadlock
	for attempt := 1; attempt <= maxRetries; attempt++ {
		tx, err := client.BeginTransaction(ctx)
		if err != nil {
			http.Error(w, "Failed to begin transaction: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// defer all constraints until commit
		tx.Exec(ctx, "SET CONSTRAINTS ALL DEFERRED") // best-effort

		// delete existing rows
		if _, err = tx.Exec(ctx, fmt.Sprintf(`DELETE FROM "%s"`, tableName)); err != nil {
			tx.Rollback(ctx)
			http.Error(w, "Failed to delete rows: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// insert each new record
		deadlockOccurred := false
		for _, record := range records {
			args := make([]any, len(columns))
			for i, col := range columns {
				args[i] = record[col]
			}
			if _, err = tx.Exec(ctx, insertSQL, args...); err != nil {
				tx.Rollback(ctx)
				// if deadlock and more retries remain, back off and retry
				if isDeadlock(err) && attempt < maxRetries {
					deadlockOccurred = true
					backoff()
					break
				}
				http.Error(w, "Failed to insert row: "+err.Error(), http.StatusInternalServerError)
				return
			}
		}

		// if deadlock, loop to retry
		if deadlockOccurred {
			continue
		}

		// commit transaction
		if err = tx.Commit(ctx); err != nil {
			// handle commit-time deadlock similarly
			if isDeadlock(err) && attempt < maxRetries {
				backoff()
				continue
			}
			http.Error(w, "Failed to commit transaction: "+err.Error(), http.StatusInternalServerError)
			return
		}

		// success
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(fmt.Sprintf("Replaced %d rows in '%s'.", len(records), tableName)))
		return
	}

	// all retries exhausted
	http.Error(w, "Operation failed after retries due to deadlocks", http.StatusInternalServerError)
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
	// sleep for baseBackoff + [0, maxJitter) milliseconds
	delay := time.Duration(baseBackoff+rand.Intn(maxJitter)) * time.Millisecond
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
