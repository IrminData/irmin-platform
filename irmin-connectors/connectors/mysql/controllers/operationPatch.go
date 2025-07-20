package mysqlcontrollers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	mysqlclient "irmin-connectors/connectors/mysql/client"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"net/http"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// OperationPatch handles the "patch" operation.
func (cs *Controllers) OperationPatch(c fiber.Ctx) error {
	// Get the operation from the context
	operation, ok := c.Locals("operation").(*db.Operation)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid operation type in context",
		})
	}

	// Initialise the MySQL client
	dbClient, database, err := mysqlclient.InitMySQLClient(c, cs.Logger, operation)
	if err != nil || database == nil || dbClient == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialise MySQL client: " + err.Error(),
		})
	}
	defer dbClient.Close()

	// Retrieve the patch file from the form
	fileHeader, err := c.FormFile("patches")
	if errors.Is(err, http.ErrMissingFile) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No JSON patch file uploaded with form field 'patches'",
		})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve form file: " + err.Error(),
		})
	}
	file, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to open form file: " + err.Error(),
		})
	}
	defer file.Close()

	// Read the entire file into memory
	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to read uploaded file: " + err.Error(),
		})
	}

	// Unmarshal the JSON into a slice of maps
	var operations []irminmodels.PatchOperation
	if err = json.Unmarshal(fileBytes, &operations); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to parse JSON data: " + err.Error(),
		})
	}

	// Apply each patch operation to the database
	for _, op := range operations {
		// Extract details from the operation path
		_, tableName, rowIdentifier, columnName := utils.ExtractPathComponents(op.Path)

		// Execute the operation in its own transaction
		if err = executePatchOperation(c, dbClient, op, tableName, rowIdentifier, columnName); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		}
	}

	// Send a success response
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Patch operations applied successfully",
	})
}

// executePatchOperation executes a single patch operation within its own transaction.
func executePatchOperation(
	c fiber.Ctx,
	dbClient *mysqlclient.MySQLClient,
	op irminmodels.PatchOperation,
	tableName, rowIdentifier, columnName string,
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
		opErr = handleMoveOperation(c, tx, op, tableName, rowIdentifier, columnName)
	case "copy":
		opErr = handleCopyOperation(c, tx, op, tableName, rowIdentifier, columnName)
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
func handleMoveOperation(
	c fiber.Ctx,
	tx *mysqlclient.Tx,
	op irminmodels.PatchOperation,
	tableName string,
	rowIdentifier any,
	columnName string,
) error {
	if op.From == nil || *op.From == "" {
		return errors.New("missing 'from' path in move operation")
	}

	// Parse the 'from' path
	_, fromTable, fromRowID, fromColumnName := utils.ExtractPathComponents(*op.From)

	// We'll determine if we're dealing with column-level or row-level move
	sourceIsColumn := (fromColumnName != "")
	destIsColumn := (columnName != "")

	switch {
	case sourceIsColumn && destIsColumn:
		return handleColumnToColumnMove(
			c,
			tx,
			fromTable,
			fromRowID,
			fromColumnName,
			tableName,
			rowIdentifier,
			columnName,
		)
	case !sourceIsColumn && !destIsColumn:
		return handleRowToRowMove(c, tx, fromTable, fromRowID, tableName, rowIdentifier)
	default:
		return errors.New("unsupported move: cannot move row to a single column or vice versa")
	}
}

// handleColumnToColumnMove handles moving a value from one column to another.
func handleColumnToColumnMove(
	c fiber.Ctx,
	tx *mysqlclient.Tx,
	fromTable string,
	fromRowID any,
	fromColumnName string,
	toTable string,
	toRowID any,
	toColumnName string,
) error {
	// Get primary key columns for source table
	fromPrimaryKeys, fromPrimaryKeysErr := getPrimaryKeyColumns(c, tx, fromTable)
	if fromPrimaryKeysErr != nil {
		return fmt.Errorf("failed to get primary key columns for source table: %w", fromPrimaryKeysErr)
	}

	// Get primary key columns for destination table
	toPrimaryKeys, toPrimaryKeysErr := getPrimaryKeyColumns(c, tx, toTable)
	if toPrimaryKeysErr != nil {
		return fmt.Errorf("failed to get primary key columns for destination table: %w", toPrimaryKeysErr)
	}

	// Build WHERE clauses
	fromWhereClause, fromWhereArgs, fromWhereClauseErr := buildWhereClause(fromPrimaryKeys, fromRowID)
	if fromWhereClauseErr != nil {
		return fmt.Errorf("failed to build FROM WHERE clause: %w", fromWhereClauseErr)
	}

	toWhereClause, toWhereArgs, toWhereClauseErr := buildWhereClause(toPrimaryKeys, toRowID)
	if toWhereClauseErr != nil {
		return fmt.Errorf("failed to build TO WHERE clause: %w", toWhereClauseErr)
	}

	// 1) SELECT the existing value from the source column
	selectSQL := fmt.Sprintf(
		"SELECT %s FROM %s WHERE %s",
		escapeIdentifier(fromColumnName), escapeIdentifier(fromTable), fromWhereClause,
	)
	var columnValue any
	if queryRowErr := tx.QueryRow(c, selectSQL, fromWhereArgs...).Scan(&columnValue); queryRowErr != nil {
		return fmt.Errorf("failed to retrieve source column for move: %w", queryRowErr)
	}

	// 2) Set the source column to NULL
	updateSourceSQL := fmt.Sprintf(
		"UPDATE %s SET %s = NULL WHERE %s",
		escapeIdentifier(fromTable), escapeIdentifier(fromColumnName), fromWhereClause,
	)
	if _, execErr := tx.Exec(c, updateSourceSQL, fromWhereArgs...); execErr != nil {
		return fmt.Errorf("failed to clear source column in move: %w", execErr)
	}

	// 3) Write the retrieved value into the destination column
	updateDestSQL := fmt.Sprintf(
		"UPDATE %s SET %s = ? WHERE %s",
		escapeIdentifier(toTable), escapeIdentifier(toColumnName), toWhereClause,
	)
	args := append([]any{columnValue}, toWhereArgs...)
	if _, execErr := tx.Exec(c, updateDestSQL, args...); execErr != nil {
		return fmt.Errorf("failed to write destination column in move: %w", execErr)
	}

	return nil
}

// handleRowToRowMove handles moving an entire row from one table to another.
func handleRowToRowMove(
	c fiber.Ctx,
	tx *mysqlclient.Tx,
	fromTable string,
	fromRowID any,
	toTable string,
	toRowID any,
) error {
	// Get primary key columns for source table
	fromPrimaryKeys, fromPrimaryKeysErr := getPrimaryKeyColumns(c, tx, fromTable)
	if fromPrimaryKeysErr != nil {
		return fmt.Errorf("failed to get primary key columns for source table: %w", fromPrimaryKeysErr)
	}

	// Get primary key columns for destination table
	toPrimaryKeys, toPrimaryKeysErr := getPrimaryKeyColumns(c, tx, toTable)
	if toPrimaryKeysErr != nil {
		return fmt.Errorf("failed to get primary key columns for destination table: %w", toPrimaryKeysErr)
	}

	// Build WHERE clauses
	fromWhereClause, fromWhereArgs, fromWhereClauseErr := buildWhereClause(fromPrimaryKeys, fromRowID)
	if fromWhereClauseErr != nil {
		return fmt.Errorf("failed to build FROM WHERE clause: %w", fromWhereClauseErr)
	}

	// 1) SELECT * from the source row
	selectSQL := fmt.Sprintf("SELECT * FROM %s WHERE %s", escapeIdentifier(fromTable), fromWhereClause)
	rows, queryErr := tx.Query(c, selectSQL, fromWhereArgs...)
	if queryErr != nil {
		return fmt.Errorf("failed to retrieve source row for move: %w", queryErr)
	}
	defer rows.Close()

	if !rows.Next() {
		if rowsErr := rows.Err(); rowsErr != nil {
			return fmt.Errorf("error during row iteration: %w", rowsErr)
		}
		return fmt.Errorf("no row found with id=%v in table %s", fromRowID, fromTable)
	}

	// Check for errors that might have occurred during iteration
	if rowsErr := rows.Err(); rowsErr != nil {
		return fmt.Errorf("error during row iteration: %w", rowsErr)
	}

	// Extract column info
	columns, columnsErr := rows.Columns()
	if columnsErr != nil {
		return fmt.Errorf("failed to get columns: %w", columnsErr)
	}
	values := make([]any, len(columns))
	valuePtrs := make([]any, len(columns))
	for i := range columns {
		valuePtrs[i] = &values[i]
	}
	if scanErr := rows.Scan(valuePtrs...); scanErr != nil {
		return fmt.Errorf("failed to scan row data: %w", scanErr)
	}

	// Build a map[columnName -> value]
	rowData := make(map[string]any, len(columns))
	for i, col := range columns {
		rowData[col] = values[i]
	}

	// 2) DELETE the source row
	deleteSQL := fmt.Sprintf("DELETE FROM %s WHERE %s", escapeIdentifier(fromTable), fromWhereClause)
	if _, execErr := tx.Exec(c, deleteSQL, fromWhereArgs...); execErr != nil {
		return fmt.Errorf("failed to remove source row in move: %w", execErr)
	}

	// 3) INSERT the row into the destination table
	// Update primary key columns with new values
	if len(toPrimaryKeys) == 1 {
		rowData[toPrimaryKeys[0]] = toRowID
	} else {
		// Handle composite primary keys
		toRowIDStr, ok := toRowID.(string)
		if !ok {
			return errors.New("composite primary key requires string identifier")
		}
		parts := strings.Split(toRowIDStr, ":")
		if len(parts) != len(toPrimaryKeys) {
			return fmt.Errorf("identifier parts (%d) don't match primary key columns (%d)", len(parts), len(toPrimaryKeys))
		}
		for i, key := range toPrimaryKeys {
			rowData[key] = parts[i]
		}
	}

	insertColumns := make([]string, 0, len(rowData))
	placeholders := make([]string, 0, len(rowData))
	args := make([]any, 0, len(rowData))

	for col, val := range rowData {
		insertColumns = append(insertColumns, escapeIdentifier(col))
		placeholders = append(placeholders, "?")
		args = append(args, val)
	}

	insertSQL := fmt.Sprintf(
		"INSERT INTO %s (%s) VALUES (%s)",
		escapeIdentifier(toTable),
		strings.Join(insertColumns, ", "),
		strings.Join(placeholders, ", "),
	)
	if _, execErr := tx.Exec(c, insertSQL, args...); execErr != nil {
		return fmt.Errorf("failed to insert row into destination table in move: %w", execErr)
	}

	return nil
}

// handleCopyOperation handles the "copy" patch operation.
func handleCopyOperation(
	c fiber.Ctx,
	tx *mysqlclient.Tx,
	op irminmodels.PatchOperation,
	tableName string,
	rowIdentifier any,
	columnName string,
) error {
	if op.From == nil || *op.From == "" {
		return errors.New("missing 'from' path in copy operation")
	}

	_, fromTable, fromRowID, fromColumnName := utils.ExtractPathComponents(*op.From)

	sourceIsColumn := (fromColumnName != "")
	destIsColumn := (columnName != "")

	switch {
	case sourceIsColumn && destIsColumn:
		return handleColumnToColumnCopy(
			c,
			tx,
			fromTable,
			fromRowID,
			fromColumnName,
			tableName,
			rowIdentifier,
			columnName,
		)
	case !sourceIsColumn && !destIsColumn:
		return handleRowToRowCopy(c, tx, fromTable, fromRowID, tableName, rowIdentifier)
	default:
		return errors.New("unsupported copy: cannot copy row to a single column or vice versa")
	}
}

// handleColumnToColumnCopy handles copying a value from one column to another.
func handleColumnToColumnCopy(
	c fiber.Ctx,
	tx *mysqlclient.Tx,
	fromTable string,
	fromRowID any,
	fromColumnName string,
	toTable string,
	toRowID any,
	toColumnName string,
) error {
	// Get primary key columns for source table
	fromPrimaryKeys, fromPrimaryKeysErr := getPrimaryKeyColumns(c, tx, fromTable)
	if fromPrimaryKeysErr != nil {
		return fmt.Errorf("failed to get primary key columns for source table: %w", fromPrimaryKeysErr)
	}

	// Get primary key columns for destination table
	toPrimaryKeys, toPrimaryKeysErr := getPrimaryKeyColumns(c, tx, toTable)
	if toPrimaryKeysErr != nil {
		return fmt.Errorf("failed to get primary key columns for destination table: %w", toPrimaryKeysErr)
	}

	// Build WHERE clauses
	fromWhereClause, fromWhereArgs, fromWhereClauseErr := buildWhereClause(fromPrimaryKeys, fromRowID)
	if fromWhereClauseErr != nil {
		return fmt.Errorf("failed to build FROM WHERE clause: %w", fromWhereClauseErr)
	}

	toWhereClause, toWhereArgs, toWhereClauseErr := buildWhereClause(toPrimaryKeys, toRowID)
	if toWhereClauseErr != nil {
		return fmt.Errorf("failed to build TO WHERE clause: %w", toWhereClauseErr)
	}

	// 1) SELECT the existing value from the source column
	selectSQL := fmt.Sprintf(
		"SELECT %s FROM %s WHERE %s",
		escapeIdentifier(fromColumnName), escapeIdentifier(fromTable), fromWhereClause,
	)
	var columnValue any
	if queryRowErr := tx.QueryRow(c, selectSQL, fromWhereArgs...).Scan(&columnValue); queryRowErr != nil {
		return fmt.Errorf("failed to retrieve source column for copy: %w", queryRowErr)
	}

	// 2) Write the retrieved value into the destination column
	updateDestSQL := fmt.Sprintf(
		"UPDATE %s SET %s = ? WHERE %s",
		escapeIdentifier(toTable), escapeIdentifier(toColumnName), toWhereClause,
	)
	args := append([]any{columnValue}, toWhereArgs...)
	if _, execErr := tx.Exec(c, updateDestSQL, args...); execErr != nil {
		return fmt.Errorf("failed to write destination column in copy: %w", execErr)
	}

	return nil
}

// handleRowToRowCopy handles copying an entire row from one table to another.
func handleRowToRowCopy(
	c fiber.Ctx,
	tx *mysqlclient.Tx,
	fromTable string,
	fromRowID any,
	toTable string,
	toRowID any,
) error {
	// Get primary key columns for source table
	fromPrimaryKeys, fromPrimaryKeysErr := getPrimaryKeyColumns(c, tx, fromTable)
	if fromPrimaryKeysErr != nil {
		return fmt.Errorf("failed to get primary key columns for source table: %w", fromPrimaryKeysErr)
	}

	// Get primary key columns for destination table
	toPrimaryKeys, toPrimaryKeysErr := getPrimaryKeyColumns(c, tx, toTable)
	if toPrimaryKeysErr != nil {
		return fmt.Errorf("failed to get primary key columns for destination table: %w", toPrimaryKeysErr)
	}

	// Build WHERE clause for source
	fromWhereClause, fromWhereArgs, fromWhereClauseErr := buildWhereClause(fromPrimaryKeys, fromRowID)
	if fromWhereClauseErr != nil {
		return fmt.Errorf("failed to build FROM WHERE clause: %w", fromWhereClauseErr)
	}

	// 1) SELECT * from the source row
	selectSQL := fmt.Sprintf("SELECT * FROM %s WHERE %s", escapeIdentifier(fromTable), fromWhereClause)
	rows, queryErr := tx.Query(c, selectSQL, fromWhereArgs...)
	if queryErr != nil {
		return fmt.Errorf("failed to retrieve source row for copy: %w", queryErr)
	}
	defer rows.Close()

	if !rows.Next() {
		if rowsErr := rows.Err(); rowsErr != nil {
			return fmt.Errorf("error during row iteration: %w", rowsErr)
		}
		return fmt.Errorf("no row found with id=%v in table %s", fromRowID, fromTable)
	}

	// Check for errors that might have occurred during iteration
	if rowsErr := rows.Err(); rowsErr != nil {
		return fmt.Errorf("error during row iteration: %w", rowsErr)
	}

	columns, columnsErr := rows.Columns()
	if columnsErr != nil {
		return fmt.Errorf("failed to get columns: %w", columnsErr)
	}
	values := make([]any, len(columns))
	valuePtrs := make([]any, len(columns))
	for i := range columns {
		valuePtrs[i] = &values[i]
	}
	if scanErr := rows.Scan(valuePtrs...); scanErr != nil {
		return fmt.Errorf("failed to scan row data: %w", scanErr)
	}

	rowData := make(map[string]any, len(columns))
	for i, col := range columns {
		rowData[col] = values[i]
	}

	// 2) INSERT the row into the destination table
	// Update primary key columns with new values
	if len(toPrimaryKeys) == 1 {
		rowData[toPrimaryKeys[0]] = toRowID
	} else {
		// Handle composite primary keys
		toRowIDStr, ok := toRowID.(string)
		if !ok {
			return errors.New("composite primary key requires string identifier")
		}
		parts := strings.Split(toRowIDStr, ":")
		if len(parts) != len(toPrimaryKeys) {
			return fmt.Errorf("identifier parts (%d) don't match primary key columns (%d)", len(parts), len(toPrimaryKeys))
		}
		for i, key := range toPrimaryKeys {
			rowData[key] = parts[i]
		}
	}

	insertColumns := make([]string, 0, len(rowData))
	placeholders := make([]string, 0, len(rowData))
	args := make([]any, 0, len(rowData))

	for col, val := range rowData {
		insertColumns = append(insertColumns, escapeIdentifier(col))
		placeholders = append(placeholders, "?")
		args = append(args, val)
	}

	insertSQL := fmt.Sprintf(
		"INSERT INTO %s (%s) VALUES (%s)",
		escapeIdentifier(toTable),
		strings.Join(insertColumns, ", "),
		strings.Join(placeholders, ", "),
	)
	if _, execErr := tx.Exec(c, insertSQL, args...); execErr != nil {
		return fmt.Errorf("failed to insert row into destination table in copy: %w", execErr)
	}

	return nil
}
