package postgrescontrollers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	postgresclient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/connectors/postgres/config"
	"irmin-connectors/db"
	"irmin-connectors/lib"
	"irmin-connectors/utils"
	"log/slog"
	"net/http"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// validateAndParsePatchRequest validates the request and parses the form data.
func validateAndParsePatchRequest(
	w http.ResponseWriter,
	r *http.Request,
	d *db.Database,
	logger *slog.Logger,
) ([]irminmodels.PatchOperation, *postgresclient.PostgresClient, error) {
	// Make sure the request is authorized by validating the operation token
	info := config.GetConnectorInfo()
	tokenValid, _, operation := lib.ValidateOperationToken(d, logger, info.Name, w, r)
	if !tokenValid {
		return nil, nil, errors.New("unauthorized")
	}

	// Parse the form data (including file uploads)
	if err := r.ParseMultipartForm(utils.DefaultMultipartFormMemory); err != nil {
		return nil, nil, fmt.Errorf("invalid form data: %w", err)
	}

	// Initialise the Postgres client
	ctx := context.Background()
	dbClient, database, err := postgresclient.InitPostgresClient(ctx, logger, operation)
	if err != nil || database == nil || dbClient == nil {
		return nil, nil, fmt.Errorf("failed to initialise Postgres client: %w", err)
	}

	// Retrieve the patch file from the form
	file, _, err := r.FormFile("patches")
	if errors.Is(err, http.ErrMissingFile) {
		return nil, nil, errors.New("no JSON patch file uploaded with form field 'patches'")
	}
	if err != nil {
		return nil, nil, fmt.Errorf("failed to retrieve form file: %w", err)
	}
	defer file.Close()

	// Read the entire file into memory
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read uploaded file: %w", err)
	}

	// Unmarshal the JSON into a slice of maps
	var operations []irminmodels.PatchOperation
	if err = json.Unmarshal(fileBytes, &operations); err != nil {
		return nil, nil, fmt.Errorf("failed to parse JSON data: %w", err)
	}

	return operations, dbClient, nil
}

// handleAddOperation handles the "add" patch operation.
func handleAddOperation(ctx context.Context, tx *postgresclient.Tx, tableName string, value any) error {
	// Make sure the value is an object
	newRow, ok := value.(map[string]any)
	if !ok {
		return errors.New("expected patch value to be an object")
	}

	// Build a list of columns from the new row
	var columns []string
	for col := range newRow {
		columns = append(columns, col)
	}

	// Build an INSERT statement dynamically
	colsPlaceholder := make([]string, len(columns))
	for i := range columns {
		colsPlaceholder[i] = fmt.Sprintf("$%d", i+1)
	}
	insertSQL := fmt.Sprintf(
		`INSERT INTO "%s" (%s) VALUES (%s)`,
		tableName,
		strings.Join(quoteIdentifiers(columns), ", "),
		strings.Join(colsPlaceholder, ", "),
	)

	// Prepare the arguments
	args := make([]any, len(columns))
	for i, col := range columns {
		args[i] = newRow[col]
	}

	// Execute the INSERT
	if _, err := tx.Exec(ctx, insertSQL, args...); err != nil {
		return fmt.Errorf("failed to insert row: %w", err)
	}

	return nil
}

// handleRemoveOperation handles the "remove" patch operation.
func handleRemoveOperation(ctx context.Context, tx *postgresclient.Tx, tableName string, rowIdentifier any) error {
	deleteSQL := fmt.Sprintf(`DELETE FROM "%s" WHERE id = $1`, tableName)
	if _, err := tx.Exec(ctx, deleteSQL, rowIdentifier); err != nil {
		return fmt.Errorf("failed to remove row: %w", err)
	}
	return nil
}

// handleReplaceOperation handles the "replace" patch operation.
func handleReplaceOperation(
	ctx context.Context,
	tx *postgresclient.Tx,
	tableName string,
	rowIdentifier any,
	columnName string,
	value any,
) error {
	if columnName != "" {
		// Single column replace
		updateSQL := fmt.Sprintf(`UPDATE "%s" SET "%s" = $1 WHERE id = $2`, tableName, columnName)
		if _, err := tx.Exec(ctx, updateSQL, value, rowIdentifier); err != nil {
			return fmt.Errorf("failed to replace column value: %w", err)
		}
		return nil
	}

	// Row-level replace
	updatedRow, ok := value.(map[string]any)
	if !ok {
		return errors.New("expected patch value to be an object")
	}

	// Build an UPDATE statement for every column in the JSON
	setClauses := make([]string, 0, len(updatedRow))
	args := make([]any, 0, len(updatedRow)+1)

	i := 1
	for col, val := range updatedRow {
		setClauses = append(
			setClauses,
			fmt.Sprintf(`"%s" = $%d`, col, i),
		)
		args = append(args, val)
		i++
	}

	updateSQL := fmt.Sprintf(
		`UPDATE "%s" SET %s WHERE id = $%d`,
		tableName,
		strings.Join(setClauses, ", "),
		i,
	)

	// Append the row identifier to the arguments
	args = append(args, rowIdentifier)

	if _, err := tx.Exec(ctx, updateSQL, args...); err != nil {
		return fmt.Errorf("failed to replace row: %w", err)
	}

	return nil
}

// handleMoveOperation handles the "move" patch operation.
func handleMoveOperation(
	ctx context.Context,
	tx *postgresclient.Tx,
	op irminmodels.PatchOperation,
	tableName string,
	rowIdentifier any,
	columnName string,
) error {
	if op.From == "" {
		return errors.New("missing 'from' path in move operation")
	}

	// Parse the 'from' path
	_, fromTable, fromRowID, fromColumnName := utils.ExtractPathComponents(op.From)

	// We'll determine if we're dealing with column-level or row-level move
	sourceIsColumn := (fromColumnName != "")
	destIsColumn := (columnName != "")

	switch {
	case sourceIsColumn && destIsColumn:
		return handleColumnToColumnMove(
			ctx,
			tx,
			fromTable,
			fromRowID,
			fromColumnName,
			tableName,
			rowIdentifier,
			columnName,
		)
	case !sourceIsColumn && !destIsColumn:
		return handleRowToRowMove(ctx, tx, fromTable, fromRowID, tableName, rowIdentifier)
	default:
		return errors.New("unsupported move: cannot move row to a single column or vice versa")
	}
}

// handleColumnToColumnMove handles moving a value from one column to another.
func handleColumnToColumnMove(
	ctx context.Context,
	tx *postgresclient.Tx,
	fromTable string,
	fromRowID any,
	fromColumnName string,
	toTable string,
	toRowID any,
	toColumnName string,
) error {
	// 1) SELECT the existing value from the source column
	selectSQL := fmt.Sprintf(
		`SELECT "%s" FROM "%s" WHERE id = $1`,
		fromColumnName, fromTable,
	)
	var columnValue any
	if err := tx.QueryRow(ctx, selectSQL, fromRowID).Scan(&columnValue); err != nil {
		return fmt.Errorf("failed to retrieve source column for move: %w", err)
	}

	// 2) Set the source column to NULL
	updateSourceSQL := fmt.Sprintf(
		`UPDATE "%s" SET "%s" = NULL WHERE id = $1`,
		fromTable, fromColumnName,
	)
	if _, err := tx.Exec(ctx, updateSourceSQL, fromRowID); err != nil {
		return fmt.Errorf("failed to clear source column in move: %w", err)
	}

	// 3) Write the retrieved value into the destination column
	updateDestSQL := fmt.Sprintf(
		`UPDATE "%s" SET "%s" = $1 WHERE id = $2`,
		toTable, toColumnName,
	)
	if _, err := tx.Exec(ctx, updateDestSQL, columnValue, toRowID); err != nil {
		return fmt.Errorf("failed to write destination column in move: %w", err)
	}

	return nil
}

// handleRowToRowMove handles moving an entire row from one table to another.
func handleRowToRowMove(
	ctx context.Context,
	tx *postgresclient.Tx,
	fromTable string,
	fromRowID any,
	toTable string,
	toRowID any,
) error {
	// 1) SELECT * from the source row
	selectSQL := fmt.Sprintf(`SELECT * FROM "%s" WHERE id = $1`, fromTable)
	rows, err := tx.Query(ctx, selectSQL, fromRowID)
	if err != nil {
		return fmt.Errorf("failed to retrieve source row for move: %w", err)
	}
	defer rows.Close()

	if !rows.Next() {
		return fmt.Errorf("no row found with id=%v in table %s", fromRowID, fromTable)
	}

	// Extract column info
	fieldDescriptions := rows.FieldDescriptions()
	values, err := rows.Values()
	if err != nil {
		return fmt.Errorf("failed to read row data: %w", err)
	}

	// Build a map[columnName -> value]
	rowData := make(map[string]any, len(fieldDescriptions))
	for i, fd := range fieldDescriptions {
		rowData[fd.Name] = values[i]
	}

	// 2) DELETE the source row
	deleteSQL := fmt.Sprintf(`DELETE FROM "%s" WHERE id = $1`, fromTable)
	if _, execErr := tx.Exec(ctx, deleteSQL, fromRowID); execErr != nil {
		return fmt.Errorf("failed to remove source row in move: %w", execErr)
	}

	// 3) INSERT the row into the destination table
	rowData["id"] = toRowID
	columns := make([]string, 0, len(rowData))
	placeholders := make([]string, 0, len(rowData))
	args := make([]any, 0, len(rowData))

	i := 1
	for col, val := range rowData {
		columns = append(columns, fmt.Sprintf(`"%s"`, col))
		placeholders = append(placeholders, fmt.Sprintf("$%d", i))
		args = append(args, val)
		i++
	}

	insertSQL := fmt.Sprintf(
		`INSERT INTO "%s" (%s) VALUES (%s)`,
		toTable,
		strings.Join(columns, ", "),
		strings.Join(placeholders, ", "),
	)
	if _, execErr := tx.Exec(ctx, insertSQL, args...); execErr != nil {
		return fmt.Errorf("failed to insert row into destination table in move: %w", execErr)
	}

	return nil
}

// handleCopyOperation handles the "copy" patch operation.
func handleCopyOperation(
	ctx context.Context,
	tx *postgresclient.Tx,
	op irminmodels.PatchOperation,
	tableName string,
	rowIdentifier any,
	columnName string,
) error {
	if op.From == "" {
		return errors.New("missing 'from' path in copy operation")
	}

	_, fromTable, fromRowID, fromColumnName := utils.ExtractPathComponents(op.From)

	sourceIsColumn := (fromColumnName != "")
	destIsColumn := (columnName != "")

	switch {
	case sourceIsColumn && destIsColumn:
		return handleColumnToColumnCopy(
			ctx,
			tx,
			fromTable,
			fromRowID,
			fromColumnName,
			tableName,
			rowIdentifier,
			columnName,
		)
	case !sourceIsColumn && !destIsColumn:
		return handleRowToRowCopy(ctx, tx, fromTable, fromRowID, tableName, rowIdentifier)
	default:
		return errors.New("unsupported copy: cannot copy row to a single column or vice versa")
	}
}

// handleColumnToColumnCopy handles copying a value from one column to another.
func handleColumnToColumnCopy(
	ctx context.Context,
	tx *postgresclient.Tx,
	fromTable string,
	fromRowID any,
	fromColumnName string,
	toTable string,
	toRowID any,
	toColumnName string,
) error {
	// 1) SELECT the existing value from the source column
	selectSQL := fmt.Sprintf(
		`SELECT "%s" FROM "%s" WHERE id = $1`,
		fromColumnName, fromTable,
	)
	var columnValue any
	if err := tx.QueryRow(ctx, selectSQL, fromRowID).Scan(&columnValue); err != nil {
		return fmt.Errorf("failed to retrieve source column for copy: %w", err)
	}

	// 2) Write the retrieved value into the destination column
	updateDestSQL := fmt.Sprintf(
		`UPDATE "%s" SET "%s" = $1 WHERE id = $2`,
		toTable, toColumnName,
	)
	if _, err := tx.Exec(ctx, updateDestSQL, columnValue, toRowID); err != nil {
		return fmt.Errorf("failed to write destination column in copy: %w", err)
	}

	return nil
}

// handleRowToRowCopy handles copying an entire row from one table to another.
func handleRowToRowCopy(
	ctx context.Context,
	tx *postgresclient.Tx,
	fromTable string,
	fromRowID any,
	toTable string,
	toRowID any,
) error {
	// 1) SELECT * from the source row
	selectSQL := fmt.Sprintf(`SELECT * FROM "%s" WHERE id = $1`, fromTable)
	rows, err := tx.Query(ctx, selectSQL, fromRowID)
	if err != nil {
		return fmt.Errorf("failed to retrieve source row for copy: %w", err)
	}
	defer rows.Close()

	if !rows.Next() {
		return fmt.Errorf("no row found with id=%v in table %s", fromRowID, fromTable)
	}

	fieldDescriptions := rows.FieldDescriptions()
	values, err := rows.Values()
	if err != nil {
		return fmt.Errorf("failed to read row data: %w", err)
	}

	rowData := make(map[string]any, len(fieldDescriptions))
	for i, fd := range fieldDescriptions {
		rowData[fd.Name] = values[i]
	}

	// 2) INSERT the row into the destination table
	rowData["id"] = toRowID
	columns := make([]string, 0, len(rowData))
	placeholders := make([]string, 0, len(rowData))
	args := make([]any, 0, len(rowData))

	i := 1
	for col, val := range rowData {
		columns = append(columns, fmt.Sprintf(`"%s"`, col))
		placeholders = append(placeholders, fmt.Sprintf("$%d", i))
		args = append(args, val)
		i++
	}

	insertSQL := fmt.Sprintf(
		`INSERT INTO "%s" (%s) VALUES (%s)`,
		toTable,
		strings.Join(columns, ", "),
		strings.Join(placeholders, ", "),
	)
	if _, execErr := tx.Exec(ctx, insertSQL, args...); execErr != nil {
		return fmt.Errorf("failed to insert row into destination table in copy: %w", execErr)
	}

	return nil
}

// OperationPatch handles the "patch" operation.
func (c *Controller) OperationPatch(w http.ResponseWriter, r *http.Request) {
	// Validate request and get operations
	operations, dbClient, err := validateAndParsePatchRequest(w, r, c.DB, c.Logger)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	defer dbClient.Close()

	ctx := context.Background()

	// Apply each patch operation to the database
	for _, op := range operations {
		// Extract details from the operation path
		_, tableName, rowIdentifier, columnName := utils.ExtractPathComponents(op.Path)

		// Start a transaction to ensure that each operation is atomic
		tx, txErr := dbClient.BeginTransaction(ctx)
		if txErr != nil {
			http.Error(w, "Failed to begin transaction: "+txErr.Error(), http.StatusInternalServerError)
			return
		}
		defer func() {
			if rollbackErr := tx.Rollback(ctx); rollbackErr != nil {
				// Log the error but don't return it since we're in a defer
				// The transaction might have already been committed
				_ = rollbackErr
			}
		}()

		// Handle the operation based on its type
		switch op.Op {
		case "add":
			err = handleAddOperation(ctx, tx, tableName, op.Value)
		case "remove":
			err = handleRemoveOperation(ctx, tx, tableName, rowIdentifier)
		case "replace":
			err = handleReplaceOperation(ctx, tx, tableName, rowIdentifier, columnName, op.Value)
		case "move":
			err = handleMoveOperation(ctx, tx, op, tableName, rowIdentifier, columnName)
		case "copy":
			err = handleCopyOperation(ctx, tx, op, tableName, rowIdentifier, columnName)
		default:
			http.Error(w, "Invalid operation type: "+op.Op, http.StatusBadRequest)
			return
		}

		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		// Commit the transaction if everything succeeded
		if err = tx.Commit(ctx); err != nil {
			http.Error(w, "Failed to commit transaction: "+err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// Send a success response
	w.WriteHeader(http.StatusOK)
	if _, writeErr := w.Write([]byte("Patch operations applied successfully")); writeErr != nil {
		http.Error(w, "Failed to write response", http.StatusInternalServerError)
		return
	}
}
