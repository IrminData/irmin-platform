package postgrescontrollers

import (
	"errors"
	"fmt"
	"irmin-connectors/connectors/common"
	postgresclient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"log/slog"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// PostgresPatchProvider implements the PatchOperationProvider interface for PostgreSQL.
type PostgresPatchProvider struct{}

// InitializeClient initializes the PostgreSQL client for patch operations.
func (p *PostgresPatchProvider) InitializeClient(
	c fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (any, func(), error) {
	dbClient, database, err := postgresclient.InitPostgresClient(c, logger, operation)
	if err != nil || database == nil || dbClient == nil {
		return nil, func() {}, err
	}

	cleanup := func() {
		dbClient.Close()
	}

	return dbClient, cleanup, nil
}

// ExecutePatchOperation executes a single patch operation within its own transaction.
func (p *PostgresPatchProvider) ExecutePatchOperation(
	c fiber.Ctx,
	client any,
	op irminmodels.PatchOperation,
	tableName, rowIdentifier, columnName string,
	_ /* fromDB */, fromTable, fromRow, fromColumn string,
) error {
	dbClient, ok := client.(*postgresclient.PostgresClient)
	if !ok {
		return errors.New("invalid client type for PostgreSQL patch provider")
	}
	return executePatchOperation(c, dbClient, op, tableName, rowIdentifier, columnName, fromTable, fromRow, fromColumn)
}

// executePatchOperation executes a single patch operation within its own transaction.
func executePatchOperation(
	c fiber.Ctx,
	dbClient *postgresclient.PostgresClient,
	op irminmodels.PatchOperation,
	tableName, rowIdentifier, columnName string,
	fromTable, fromRow, fromColumn string,
) error {
	// Start a transaction to ensure that each operation is atomic
	tx, txErr := dbClient.BeginTransaction(c)
	if txErr != nil {
		return txErr
	}
	defer func() {
		if rollbackErr := tx.Rollback(c); rollbackErr != nil {
			// Log the error but don't return it since we're in a defer
			// The transaction might have already been committed
			_ = rollbackErr
		}
	}()

	// Decode binary value if ContentType indicates binary data
	value := op.Value
	if op.ContentType != nil && value != nil {
		decodedValue, _, decodeErr := utils.DecodeBinaryValue(op.ContentType, *value)
		if decodeErr != nil {
			return fmt.Errorf("failed to decode binary value: %w", decodeErr)
		}
		value = &decodedValue
	}

	// Handle the operation based on its type
	var err error
	switch op.Op {
	case "add":
		err = handleAddOperation(c, tx, tableName, value)
	case "remove":
		err = handleRemoveOperation(c, tx, tableName, rowIdentifier)
	case "replace":
		err = handleReplaceOperation(c, tx, tableName, rowIdentifier, columnName, value)
	case "move":
		err = handleMoveOperation(c, tx, tableName, rowIdentifier, columnName, fromTable, fromRow, fromColumn)
	case "copy":
		err = handleCopyOperation(c, tx, tableName, rowIdentifier, columnName, fromTable, fromRow, fromColumn)
	default:
		return errors.New("invalid operation type: " + op.Op)
	}

	if err != nil {
		return err
	}

	// Commit the transaction if everything succeeded
	if err = tx.Commit(c); err != nil {
		return err
	}

	return nil
}

// OperationPatch godoc
// @Summary Patch data in PostgreSQL database
// @Description Apply granular updates to PostgreSQL database records using JSON patch operations
// @Tags postgres
// @Security OperationTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param patch formData file true "JSON patch file containing update operations"
// @Success 200 {object} fiber.Map "Data patched successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token or patch format"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /postgres/operation/patch [post]
func (cs *Controllers) OperationPatch(c fiber.Ctx) error {
	provider := &PostgresPatchProvider{}
	return common.HandleOperationPatch(c, provider, cs.Logger, cs.DB)
}

// handleAddOperation handles the "add" patch operation.
func handleAddOperation(c fiber.Ctx, tx *postgresclient.Tx, tableName string, value any) error {
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
		`INSERT INTO %s (%s) VALUES (%s)`,
		quoteIdentifier(tableName),
		strings.Join(quoteIdentifiers(columns), ", "),
		strings.Join(colsPlaceholder, ", "),
	)

	// Prepare the arguments
	args := make([]any, len(columns))
	for i, col := range columns {
		args[i] = newRow[col]
	}

	// Execute the INSERT
	if _, err := tx.Exec(c, insertSQL, args...); err != nil {
		return fmt.Errorf("failed to insert row: %w", err)
	}

	return nil
}

// handleRemoveOperation handles the "remove" patch operation.
func handleRemoveOperation(c fiber.Ctx, tx *postgresclient.Tx, tableName string, rowIdentifier any) error {
	// Get primary key columns for this table
	primaryKeys, primaryKeysErr := getPrimaryKeyColumns(c, tx, tableName)
	if primaryKeysErr != nil {
		return fmt.Errorf("failed to get primary key columns: %w", primaryKeysErr)
	}

	// Build WHERE clause with dynamic primary keys
	whereClause, whereArgs, whereClauseErr := buildWhereClause(primaryKeys, rowIdentifier)
	if whereClauseErr != nil {
		return fmt.Errorf("failed to build WHERE clause: %w", whereClauseErr)
	}

	deleteSQL := fmt.Sprintf(`DELETE FROM %s WHERE %s`, quoteIdentifier(tableName), whereClause)
	if _, execErr := tx.Exec(c, deleteSQL, whereArgs...); execErr != nil {
		return fmt.Errorf("failed to remove row: %w", execErr)
	}
	return nil
}

// handleReplaceOperation handles the "replace" patch operation.
func handleReplaceOperation(
	c fiber.Ctx,
	tx *postgresclient.Tx,
	tableName string,
	rowIdentifier any,
	columnName string,
	value any,
) error {
	// Get primary key columns for this table
	primaryKeys, primaryKeysErr := getPrimaryKeyColumns(c, tx, tableName)
	if primaryKeysErr != nil {
		return fmt.Errorf("failed to get primary key columns: %w", primaryKeysErr)
	}

	if columnName != "" {
		// Single column replace: $1 is used for the new value, so WHERE clause starts at $2
		const setClauseParamCount = 1
		whereClause, whereArgs, whereClauseErr := buildWhereClauseWithOffset(
			primaryKeys,
			rowIdentifier,
			setClauseParamCount+1,
		)
		if whereClauseErr != nil {
			return fmt.Errorf("failed to build WHERE clause: %w", whereClauseErr)
		}

		updateSQL := fmt.Sprintf(
			`UPDATE %s SET %s = $1 WHERE %s`,
			quoteIdentifier(tableName),
			quoteIdentifier(columnName),
			whereClause,
		)
		args := append([]any{value}, whereArgs...)
		if _, execErr := tx.Exec(c, updateSQL, args...); execErr != nil {
			return fmt.Errorf("failed to replace column value: %w", execErr)
		}
		return nil
	}

	// Row-level replace
	updatedRow, ok := value.(map[string]any)
	if !ok {
		return errors.New("expected patch value to be an object")
	}

	// Build WHERE clause with parameter indices starting after SET clause parameters
	whereClause, whereArgs, whereClauseErr := buildWhereClauseWithOffset(primaryKeys, rowIdentifier, len(updatedRow)+1)
	if whereClauseErr != nil {
		return fmt.Errorf("failed to build WHERE clause: %w", whereClauseErr)
	}

	// Build an UPDATE statement for every column in the JSON
	setClauses := make([]string, 0, len(updatedRow))
	args := make([]any, 0, len(updatedRow)+len(whereArgs))

	paramIndex := 1
	for col, val := range updatedRow {
		setClauses = append(
			setClauses,
			fmt.Sprintf(`%s = $%d`, quoteIdentifier(col), paramIndex),
		)
		args = append(args, val)
		paramIndex++
	}

	updateSQL := fmt.Sprintf(
		`UPDATE %s SET %s WHERE %s`,
		quoteIdentifier(tableName),
		strings.Join(setClauses, ", "),
		whereClause,
	)

	// Append the WHERE arguments
	args = append(args, whereArgs...)

	if _, execErr := tx.Exec(c, updateSQL, args...); execErr != nil {
		return fmt.Errorf("failed to replace row: %w", execErr)
	}

	return nil
}

// handleMoveOperation handles the "move" patch operation.
// It copies data from the source location to the destination, then removes it from the source.
func handleMoveOperation(
	c fiber.Ctx,
	tx *postgresclient.Tx,
	tableName, rowIdentifier, columnName string,
	fromTable, fromRow, fromColumn string,
) error {
	// First copy the data
	if err := handleCopyOperation(c, tx, tableName, rowIdentifier, columnName, fromTable, fromRow, fromColumn); err != nil {
		return fmt.Errorf("failed to copy data during move operation: %w", err)
	}

	// Then remove from source
	if fromColumn != "" {
		// Column-level move: set the source column to NULL
		if err := handleReplaceOperation(c, tx, fromTable, fromRow, fromColumn, nil); err != nil {
			return fmt.Errorf("failed to remove source data during move operation: %w", err)
		}
	} else {
		// Row-level move: delete the entire source row
		if err := handleRemoveOperation(c, tx, fromTable, fromRow); err != nil {
			return fmt.Errorf("failed to remove source row during move operation: %w", err)
		}
	}

	return nil
}

// handleCopyOperation handles the "copy" patch operation.
// It copies data from the source location to the destination without removing the source.
func handleCopyOperation(
	c fiber.Ctx,
	tx *postgresclient.Tx,
	tableName, rowIdentifier, columnName string,
	fromTable, fromRow, fromColumn string,
) error {
	if fromColumn != "" && columnName != "" {
		// Column-to-column copy
		return handleColumnCopy(c, tx, tableName, rowIdentifier, columnName, fromTable, fromRow, fromColumn)
	}
	if fromColumn == "" && columnName == "" {
		// Row-to-row copy
		return handleRowCopy(c, tx, tableName, rowIdentifier, fromTable, fromRow)
	}
	return errors.New(
		"copy operation requires both source and destination to be at the same level (column-to-column or row-to-row)",
	)
}

// handleColumnCopy copies a single column value from source to destination.
func handleColumnCopy(
	c fiber.Ctx,
	tx *postgresclient.Tx,
	tableName, rowIdentifier, columnName string,
	fromTable, fromRow, fromColumn string,
) error {
	// Get primary key columns for the source table
	primaryKeys, primaryKeysErr := getPrimaryKeyColumns(c, tx, fromTable)
	if primaryKeysErr != nil {
		return fmt.Errorf("failed to get primary key columns for source table: %w", primaryKeysErr)
	}

	// Build WHERE clause with dynamic primary keys
	whereClause, whereArgs, whereClauseErr := buildWhereClause(primaryKeys, fromRow)
	if whereClauseErr != nil {
		return fmt.Errorf("failed to build WHERE clause for source row: %w", whereClauseErr)
	}

	// Get the value from the source column
	selectSQL := fmt.Sprintf(
		`SELECT %s FROM %s WHERE %s`,
		quoteIdentifier(fromColumn),
		quoteIdentifier(fromTable),
		whereClause,
	)

	var value any
	if err := tx.QueryRow(c, selectSQL, whereArgs...).Scan(&value); err != nil {
		return fmt.Errorf("failed to read source column value: %w", err)
	}

	// Update the destination column
	return handleReplaceOperation(c, tx, tableName, rowIdentifier, columnName, value)
}

// handleUpsertOperation handles inserting or updating a row (UPSERT).
// If the row exists (based on primary key), it updates; otherwise it inserts.
func handleUpsertOperation(
	c fiber.Ctx,
	tx *postgresclient.Tx,
	tableName string,
	value any,
	primaryKeys []string,
) error {
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

	// Build placeholders for INSERT
	colsPlaceholder := make([]string, len(columns))
	for i := range columns {
		colsPlaceholder[i] = fmt.Sprintf("$%d", i+1)
	}

	// Build the SET clause for UPDATE (exclude primary key columns from updates)
	var updateClauses []string
	for _, col := range columns {
		isPrimaryKey := false
		for _, pk := range primaryKeys {
			if pk == col {
				isPrimaryKey = true
				break
			}
		}
		if !isPrimaryKey {
			updateClauses = append(
				updateClauses,
				fmt.Sprintf("%s = EXCLUDED.%s", quoteIdentifier(col), quoteIdentifier(col)),
			)
		}
	}

	// Build conflict target (primary key columns)
	conflictTarget := strings.Join(quoteIdentifiers(primaryKeys), ", ")

	// Build the UPSERT statement
	var upsertSQL string
	if len(updateClauses) > 0 {
		upsertSQL = fmt.Sprintf(
			`INSERT INTO %s (%s) VALUES (%s) ON CONFLICT (%s) DO UPDATE SET %s`,
			quoteIdentifier(tableName),
			strings.Join(quoteIdentifiers(columns), ", "),
			strings.Join(colsPlaceholder, ", "),
			conflictTarget,
			strings.Join(updateClauses, ", "),
		)
	} else {
		// If all columns are primary keys, just do nothing on conflict
		upsertSQL = fmt.Sprintf(
			`INSERT INTO %s (%s) VALUES (%s) ON CONFLICT (%s) DO NOTHING`,
			quoteIdentifier(tableName),
			strings.Join(quoteIdentifiers(columns), ", "),
			strings.Join(colsPlaceholder, ", "),
			conflictTarget,
		)
	}

	// Prepare the arguments
	args := make([]any, len(columns))
	for i, col := range columns {
		args[i] = newRow[col]
	}

	// Execute the UPSERT
	if _, err := tx.Exec(c, upsertSQL, args...); err != nil {
		return fmt.Errorf("failed to upsert row: %w", err)
	}

	return nil
}

// handleRowCopy copies an entire row from source to destination.
func handleRowCopy(
	c fiber.Ctx,
	tx *postgresclient.Tx,
	tableName, rowIdentifier string,
	fromTable, fromRow string,
) error {
	// Get primary key columns for both tables
	sourcePrimaryKeys, err := getPrimaryKeyColumns(c, tx, fromTable)
	if err != nil {
		return fmt.Errorf("failed to get primary key columns for source table: %w", err)
	}

	destPrimaryKeys, err := getPrimaryKeyColumns(c, tx, tableName)
	if err != nil {
		return fmt.Errorf("failed to get primary key columns for destination table: %w", err)
	}

	// Get table columns
	columns, err := getTableColumns(c, tx, fromTable)
	if err != nil {
		return fmt.Errorf("failed to get table columns: %w", err)
	}

	// Read source row data
	values, err := readSourceRowData(c, tx, fromTable, fromRow, sourcePrimaryKeys, columns)
	if err != nil {
		return fmt.Errorf("failed to read source row: %w", err)
	}

	// Build destination row data with updated primary keys
	newRowData, err := buildDestinationRowData(columns, values, destPrimaryKeys, rowIdentifier)
	if err != nil {
		return fmt.Errorf("failed to build destination row data: %w", err)
	}

	// Upsert the row (insert or update if exists)
	return handleUpsertOperation(c, tx, tableName, newRowData, destPrimaryKeys)
}

// getTableColumns retrieves all column names for a table.
func getTableColumns(c fiber.Ctx, tx *postgresclient.Tx, tableName string) ([]string, error) {
	columnsSQL := `
		SELECT column_name 
		FROM information_schema.columns 
		WHERE table_name = $1 
		AND table_schema = current_schema()
		ORDER BY ordinal_position
	`

	rows, err := tx.Query(c, columnsSQL, tableName)
	if err != nil {
		return nil, fmt.Errorf("failed to get table columns: %w", err)
	}
	defer rows.Close()

	var columns []string
	for rows.Next() {
		var column string
		if scanErr := rows.Scan(&column); scanErr != nil {
			return nil, fmt.Errorf("failed to scan column name: %w", scanErr)
		}
		columns = append(columns, column)
	}

	if rowsErr := rows.Err(); rowsErr != nil {
		return nil, fmt.Errorf("error during rows iteration: %w", rowsErr)
	}

	if len(columns) == 0 {
		return nil, errors.New("no columns found in source table")
	}

	return columns, nil
}

// readSourceRowData reads the source row data for all columns.
func readSourceRowData(
	c fiber.Ctx,
	tx *postgresclient.Tx,
	fromTable, fromRow string,
	primaryKeys, columns []string,
) ([]any, error) {
	// Build WHERE clause with dynamic primary keys for source row
	whereClause, whereArgs, err := buildWhereClause(primaryKeys, fromRow)
	if err != nil {
		return nil, fmt.Errorf("failed to build WHERE clause for source row: %w", err)
	}

	// Read the source row data
	quotedColumns := quoteIdentifiers(columns)
	selectSQL := fmt.Sprintf(
		`SELECT %s FROM %s WHERE %s`,
		strings.Join(quotedColumns, ", "),
		quoteIdentifier(fromTable),
		whereClause,
	)

	sourceRow, err := tx.Query(c, selectSQL, whereArgs...)
	if err != nil {
		return nil, fmt.Errorf("failed to read source row: %w", err)
	}
	defer sourceRow.Close()

	if !sourceRow.Next() {
		return nil, errors.New("source row not found")
	}

	// Scan the source row values
	values := make([]any, len(columns))
	valuePtrs := make([]any, len(columns))
	for i := range values {
		valuePtrs[i] = &values[i]
	}

	if scanErr := sourceRow.Scan(valuePtrs...); scanErr != nil {
		return nil, fmt.Errorf("failed to scan source row values: %w", scanErr)
	}

	if rowsErr := sourceRow.Err(); rowsErr != nil {
		return nil, fmt.Errorf("error during source row iteration: %w", rowsErr)
	}

	return values, nil
}

// parsePrimaryKeyValues parses the row identifier into individual primary key values.
// Uses URL encoding to handle values that contain colon characters.
func parsePrimaryKeyValues(primaryKeys []string, rowIdentifier string) ([]string, error) {
	return utils.DecodeCompositeKey(rowIdentifier, len(primaryKeys))
}

// buildDestinationRowData creates a new row map with updated primary key values.
func buildDestinationRowData(
	columns []string,
	values []any,
	destPrimaryKeys []string,
	rowIdentifier string,
) (map[string]any, error) {
	// Parse destination row identifier for composite primary keys
	destPrimaryKeyValues, err := parsePrimaryKeyValues(destPrimaryKeys, rowIdentifier)
	if err != nil {
		return nil, err
	}

	// Create a map of destination primary key columns to their new values
	destPrimaryKeyMap := make(map[string]string)
	for i, key := range destPrimaryKeys {
		destPrimaryKeyMap[key] = destPrimaryKeyValues[i]
	}

	// Create a map for the new row and update the primary key columns
	newRowData := make(map[string]any)

	// Copy all column values, replacing primary key values with destination values
	for i, column := range columns {
		if newStringValue, isPrimaryKey := destPrimaryKeyMap[column]; isPrimaryKey {
			// Convert the new string value to match the original type
			convertedValue, convertErr := utils.ConvertStringToType(newStringValue, values[i])
			if convertErr != nil {
				return nil, fmt.Errorf("failed to convert primary key value for column %s: %w", column, convertErr)
			}
			newRowData[column] = convertedValue
		} else {
			newRowData[column] = values[i]
		}
	}

	return newRowData, nil
}
