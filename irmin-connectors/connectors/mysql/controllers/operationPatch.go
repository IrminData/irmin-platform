package mysqlcontrollers

import (
	"errors"
	"fmt"
	"irmin-connectors/connectors/common"
	mysqlclient "irmin-connectors/connectors/mysql/client"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"log/slog"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// MySQLPatchProvider implements the PatchOperationProvider interface for MySQL.
type MySQLPatchProvider struct{}

// InitializeClient initializes the MySQL client for patch operations.
func (p *MySQLPatchProvider) InitializeClient(
	c fiber.Ctx,
	logger *slog.Logger,
	operation *db.Operation,
) (any, func(), error) {
	dbClient, database, err := mysqlclient.InitMySQLClient(c, logger, operation)
	if err != nil || database == nil || dbClient == nil {
		return nil, func() {}, err
	}

	cleanup := func() {
		if closeErr := dbClient.Close(); closeErr != nil {
			logger.Error("Failed to close MySQL client", "error", closeErr)
		}
	}

	return dbClient, cleanup, nil
}

// ExecutePatchOperation executes a single patch operation within its own transaction.
func (p *MySQLPatchProvider) ExecutePatchOperation(
	c fiber.Ctx,
	client any,
	op irminmodels.PatchOperation,
	tableName, rowIdentifier, columnName string,
	_ /* fromDB */, fromTable, fromRow, fromColumn string,
) error {
	dbClient, ok := client.(*mysqlclient.MySQLClient)
	if !ok {
		return errors.New("invalid client type for MySQL patch provider")
	}

	return executePatchOperation(c, dbClient, op, tableName, rowIdentifier, columnName, fromTable, fromRow, fromColumn)
}

// OperationPatch godoc
// @Summary Patch data in MySQL database
// @Description Apply granular updates to MySQL database records using JSON patch operations
// @Tags mysql
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param patch formData file true "JSON patch file containing update operations"
// @Success 200 {object} fiber.Map "Data patched successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token or patch format"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /mysql/operation/patch [post]
func (cs *Controllers) OperationPatch(c fiber.Ctx) error {
	provider := &MySQLPatchProvider{}
	return common.HandleOperationPatch(c, provider, cs.Logger)
}

// executePatchOperation executes a single patch operation within its own transaction.
func executePatchOperation(
	c fiber.Ctx,
	dbClient *mysqlclient.MySQLClient,
	op irminmodels.PatchOperation,
	tableName, rowIdentifier, columnName string,
	fromTable, fromRow, fromColumn string,
) error {
	// Start a transaction for this operation
	tx, err := dbClient.BeginTransaction(c)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	// Track whether the transaction was successfully committed
	var committed bool

	// Ensure the transaction is properly closed
	defer func() {
		if !committed {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				// Log the rollback error but don't return it since we're in a defer
				// This preserves the original error that caused the rollback
				_ = rollbackErr
			}
		}
	}()

	// Handle the operation based on its type
	var opErr error
	switch op.Op {
	case "add":
		opErr = handleAddOperation(c, tx, tableName, op.Value)
	case "remove":
		opErr = handleRemoveOperation(c, tx, tableName, rowIdentifier)
	case "replace":
		opErr = handleReplaceOperation(c, tx, tableName, rowIdentifier, columnName, op.Value)
	case "move":
		opErr = handleMoveOperation(c, tx, tableName, rowIdentifier, columnName, fromTable, fromRow, fromColumn)
	case "copy":
		opErr = handleCopyOperation(c, tx, tableName, rowIdentifier, columnName, fromTable, fromRow, fromColumn)
	default:
		return fmt.Errorf("invalid operation type: %s", op.Op)
	}
	if opErr != nil {
		return opErr
	}

	// Commit the transaction if everything succeeded
	if commitErr := tx.Commit(); commitErr != nil {
		return fmt.Errorf("failed to commit transaction: %w", commitErr)
	}

	// Mark the transaction as successfully committed
	committed = true
	return nil
}

// handleAddOperation handles the "add" patch operation.
func handleAddOperation(c fiber.Ctx, tx *mysqlclient.Tx, tableName string, value any) error {
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
		colsPlaceholder[i] = "?"
	}
	insertSQL := fmt.Sprintf(
		"INSERT INTO %s (%s) VALUES (%s)",
		escapeIdentifier(tableName),
		strings.Join(escapeIdentifiers(columns), ", "),
		strings.Join(colsPlaceholder, ", "),
	)

	// Prepare the arguments
	args := make([]any, len(columns))
	for i, col := range columns {
		args[i] = newRow[col]
	}

	// Execute the INSERT
	if _, execErr := tx.Exec(c, insertSQL, args...); execErr != nil {
		return fmt.Errorf("failed to insert row: %w", execErr)
	}

	return nil
}

// handleRemoveOperation handles the "remove" patch operation.
func handleRemoveOperation(c fiber.Ctx, tx *mysqlclient.Tx, tableName string, rowIdentifier any) error {
	// Get primary key columns for this table
	primaryKeys, err := getPrimaryKeyColumns(c, tx, tableName)
	if err != nil {
		return fmt.Errorf("failed to get primary key columns: %w", err)
	}

	// Build WHERE clause with dynamic primary keys
	whereClause, args, err := buildWhereClause(primaryKeys, rowIdentifier)
	if err != nil {
		return fmt.Errorf("failed to build WHERE clause: %w", err)
	}

	deleteSQL := fmt.Sprintf("DELETE FROM %s WHERE %s", escapeIdentifier(tableName), whereClause)
	if _, execErr := tx.Exec(c, deleteSQL, args...); execErr != nil {
		return fmt.Errorf("failed to remove row: %w", execErr)
	}
	return nil
}

// handleReplaceOperation handles the "replace" patch operation.
func handleReplaceOperation(
	c fiber.Ctx,
	tx *mysqlclient.Tx,
	tableName string,
	rowIdentifier any,
	columnName string,
	value any,
) error {
	// Get primary key columns for this table
	primaryKeys, err := getPrimaryKeyColumns(c, tx, tableName)
	if err != nil {
		return fmt.Errorf("failed to get primary key columns: %w", err)
	}

	// Build WHERE clause with dynamic primary keys
	whereClause, whereArgs, err := buildWhereClause(primaryKeys, rowIdentifier)
	if err != nil {
		return fmt.Errorf("failed to build WHERE clause: %w", err)
	}

	if columnName != "" {
		// Single column replace
		updateSQL := fmt.Sprintf(
			"UPDATE %s SET %s = ? WHERE %s",
			escapeIdentifier(tableName),
			escapeIdentifier(columnName),
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

	// Build an UPDATE statement for every column in the JSON
	setClauses := make([]string, 0, len(updatedRow))
	args := make([]any, 0, len(updatedRow)+len(whereArgs))

	for col, val := range updatedRow {
		setClauses = append(
			setClauses,
			fmt.Sprintf("%s = ?", escapeIdentifier(col)),
		)
		args = append(args, val)
	}

	updateSQL := fmt.Sprintf(
		"UPDATE %s SET %s WHERE %s",
		escapeIdentifier(tableName),
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
	tx *mysqlclient.Tx,
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
	tx *mysqlclient.Tx,
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
	tx *mysqlclient.Tx,
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
		"SELECT %s FROM %s WHERE %s",
		escapeIdentifier(fromColumn),
		escapeIdentifier(fromTable),
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
// If the row exists (based on primary key), it replaces; otherwise it inserts.
func handleUpsertOperation(c fiber.Ctx, tx *mysqlclient.Tx, tableName string, value any) error {
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

	// Build placeholders for REPLACE
	colsPlaceholder := make([]string, len(columns))
	for i := range columns {
		colsPlaceholder[i] = "?"
	}

	// Build the REPLACE statement (MySQL's UPSERT equivalent)
	replaceSQL := fmt.Sprintf(
		"REPLACE INTO %s (%s) VALUES (%s)",
		escapeIdentifier(tableName),
		strings.Join(escapeIdentifiers(columns), ", "),
		strings.Join(colsPlaceholder, ", "),
	)

	// Prepare the arguments
	args := make([]any, len(columns))
	for i, col := range columns {
		args[i] = newRow[col]
	}

	// Execute the REPLACE
	if _, err := tx.Exec(c, replaceSQL, args...); err != nil {
		return fmt.Errorf("failed to replace row: %w", err)
	}

	return nil
}

// handleRowCopy copies an entire row from source to destination.
func handleRowCopy(
	c fiber.Ctx,
	tx *mysqlclient.Tx,
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

	// Replace the row (insert or overwrite if exists)
	return handleUpsertOperation(c, tx, tableName, newRowData)
}

// getTableColumns retrieves all column names for a table.
func getTableColumns(c fiber.Ctx, tx *mysqlclient.Tx, tableName string) ([]string, error) {
	columnsSQL := `
		SELECT COLUMN_NAME 
		FROM INFORMATION_SCHEMA.COLUMNS 
		WHERE TABLE_NAME = ? 
		AND TABLE_SCHEMA = DATABASE()
		ORDER BY ORDINAL_POSITION
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
	tx *mysqlclient.Tx,
	fromTable, fromRow string,
	primaryKeys, columns []string,
) ([]any, error) {
	// Build WHERE clause with dynamic primary keys for source row
	whereClause, whereArgs, err := buildWhereClause(primaryKeys, fromRow)
	if err != nil {
		return nil, fmt.Errorf("failed to build WHERE clause for source row: %w", err)
	}

	// Build quoted column names for MySQL
	quotedColumns := escapeIdentifiers(columns)

	// Read the source row data
	selectSQL := fmt.Sprintf(
		"SELECT %s FROM %s WHERE %s",
		strings.Join(quotedColumns, ", "),
		escapeIdentifier(fromTable),
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
