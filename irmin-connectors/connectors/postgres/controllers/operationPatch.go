package postgrescontrollers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	postgresclient "irmin-connectors/connectors/postgres/client"
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

	// Initialise the Postgres client
	ctx := c.Context()
	dbClient, database, err := postgresclient.InitPostgresClient(ctx, cs.Logger, operation)
	if err != nil || database == nil || dbClient == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialise Postgres client: " + err.Error(),
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

		// Start a transaction to ensure that each operation is atomic
		tx, txErr := dbClient.BeginTransaction(ctx)
		if txErr != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to begin transaction: " + txErr.Error(),
			})
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
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid operation type: " + op.Op,
			})
		}

		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		}

		// Commit the transaction if everything succeeded
		if err = tx.Commit(ctx); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to commit transaction: " + err.Error(),
			})
		}
	}

	// Send a success response
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "Patch operations applied successfully",
	})
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
	if _, err := tx.Exec(ctx, insertSQL, args...); err != nil {
		return fmt.Errorf("failed to insert row: %w", err)
	}

	return nil
}

// handleRemoveOperation handles the "remove" patch operation.
func handleRemoveOperation(ctx context.Context, tx *postgresclient.Tx, tableName string, rowIdentifier any) error {
	// Get primary key columns for this table
	primaryKeys, primaryKeysErr := getPrimaryKeyColumns(ctx, tx, tableName)
	if primaryKeysErr != nil {
		return fmt.Errorf("failed to get primary key columns: %w", primaryKeysErr)
	}

	// Build WHERE clause with dynamic primary keys
	whereClause, whereArgs, whereClauseErr := buildWhereClause(primaryKeys, rowIdentifier)
	if whereClauseErr != nil {
		return fmt.Errorf("failed to build WHERE clause: %w", whereClauseErr)
	}

	deleteSQL := fmt.Sprintf(`DELETE FROM %s WHERE %s`, quoteIdentifier(tableName), whereClause)
	if _, execErr := tx.Exec(ctx, deleteSQL, whereArgs...); execErr != nil {
		return fmt.Errorf("failed to remove row: %w", execErr)
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
	// Get primary key columns for this table
	primaryKeys, primaryKeysErr := getPrimaryKeyColumns(ctx, tx, tableName)
	if primaryKeysErr != nil {
		return fmt.Errorf("failed to get primary key columns: %w", primaryKeysErr)
	}

	// Build WHERE clause with dynamic primary keys
	whereClause, whereArgs, whereClauseErr := buildWhereClause(primaryKeys, rowIdentifier)
	if whereClauseErr != nil {
		return fmt.Errorf("failed to build WHERE clause: %w", whereClauseErr)
	}

	if columnName != "" {
		// Single column replace
		updateSQL := fmt.Sprintf(
			`UPDATE %s SET %s = $1 WHERE %s`,
			quoteIdentifier(tableName),
			quoteIdentifier(columnName),
			whereClause,
		)
		args := append([]any{value}, whereArgs...)
		if _, execErr := tx.Exec(ctx, updateSQL, args...); execErr != nil {
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

	if _, execErr := tx.Exec(ctx, updateSQL, args...); execErr != nil {
		return fmt.Errorf("failed to replace row: %w", execErr)
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
	// Get primary key columns for source table
	fromPrimaryKeys, fromPrimaryKeysErr := getPrimaryKeyColumns(ctx, tx, fromTable)
	if fromPrimaryKeysErr != nil {
		return fmt.Errorf("failed to get primary key columns for source table: %w", fromPrimaryKeysErr)
	}

	// Get primary key columns for destination table
	toPrimaryKeys, toPrimaryKeysErr := getPrimaryKeyColumns(ctx, tx, toTable)
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
		`SELECT %s FROM %s WHERE %s`,
		quoteIdentifier(fromColumnName), quoteIdentifier(fromTable), fromWhereClause,
	)
	var columnValue any
	if queryRowErr := tx.QueryRow(ctx, selectSQL, fromWhereArgs...).Scan(&columnValue); queryRowErr != nil {
		return fmt.Errorf("failed to retrieve source column for move: %w", queryRowErr)
	}

	// 2) Set the source column to NULL
	updateSourceSQL := fmt.Sprintf(
		`UPDATE %s SET %s = NULL WHERE %s`,
		quoteIdentifier(fromTable), quoteIdentifier(fromColumnName), fromWhereClause,
	)
	if _, execErr := tx.Exec(ctx, updateSourceSQL, fromWhereArgs...); execErr != nil {
		return fmt.Errorf("failed to clear source column in move: %w", execErr)
	}

	// 3) Write the retrieved value into the destination column
	updateDestSQL := fmt.Sprintf(
		`UPDATE %s SET %s = $1 WHERE %s`,
		quoteIdentifier(toTable), quoteIdentifier(toColumnName), toWhereClause,
	)
	args := append([]any{columnValue}, toWhereArgs...)
	if _, execErr := tx.Exec(ctx, updateDestSQL, args...); execErr != nil {
		return fmt.Errorf("failed to write destination column in move: %w", execErr)
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
	// Get primary key columns for source table
	fromPrimaryKeys, fromPrimaryKeysErr := getPrimaryKeyColumns(ctx, tx, fromTable)
	if fromPrimaryKeysErr != nil {
		return fmt.Errorf("failed to get primary key columns for source table: %w", fromPrimaryKeysErr)
	}

	// Get primary key columns for destination table
	toPrimaryKeys, toPrimaryKeysErr := getPrimaryKeyColumns(ctx, tx, toTable)
	if toPrimaryKeysErr != nil {
		return fmt.Errorf("failed to get primary key columns for destination table: %w", toPrimaryKeysErr)
	}

	// Build WHERE clause for source
	fromWhereClause, fromWhereArgs, fromWhereClauseErr := buildWhereClause(fromPrimaryKeys, fromRowID)
	if fromWhereClauseErr != nil {
		return fmt.Errorf("failed to build FROM WHERE clause: %w", fromWhereClauseErr)
	}

	// 1) SELECT * from the source row
	selectSQL := fmt.Sprintf(`SELECT * FROM %s WHERE %s`, quoteIdentifier(fromTable), fromWhereClause)
	rows, queryErr := tx.Query(ctx, selectSQL, fromWhereArgs...)
	if queryErr != nil {
		return fmt.Errorf("failed to retrieve source row for move: %w", queryErr)
	}
	defer rows.Close()

	if !rows.Next() {
		return fmt.Errorf("no row found with id=%v in table %s", fromRowID, fromTable)
	}

	// Extract column info
	fieldDescriptions := rows.FieldDescriptions()
	values, valuesErr := rows.Values()
	if valuesErr != nil {
		return fmt.Errorf("failed to read row data: %w", valuesErr)
	}

	// Build a map[columnName -> value]
	rowData := make(map[string]any, len(fieldDescriptions))
	for i, fd := range fieldDescriptions {
		rowData[fd.Name] = values[i]
	}

	// 2) DELETE the source row
	deleteSQL := fmt.Sprintf(`DELETE FROM %s WHERE %s`, quoteIdentifier(fromTable), fromWhereClause)
	if _, execErr := tx.Exec(ctx, deleteSQL, fromWhereArgs...); execErr != nil {
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

	columns := make([]string, 0, len(rowData))
	placeholders := make([]string, 0, len(rowData))
	args := make([]any, 0, len(rowData))

	paramIndex := 1
	for col, val := range rowData {
		columns = append(columns, quoteIdentifier(col))
		placeholders = append(placeholders, fmt.Sprintf("$%d", paramIndex))
		args = append(args, val)
		paramIndex++
	}

	insertSQL := fmt.Sprintf(
		`INSERT INTO %s (%s) VALUES (%s)`,
		quoteIdentifier(toTable),
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
	if op.From == nil || *op.From == "" {
		return errors.New("missing 'from' path in copy operation")
	}

	_, fromTable, fromRowID, fromColumnName := utils.ExtractPathComponents(*op.From)

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
	// Get primary key columns for source table
	fromPrimaryKeys, fromPrimaryKeysErr := getPrimaryKeyColumns(ctx, tx, fromTable)
	if fromPrimaryKeysErr != nil {
		return fmt.Errorf("failed to get primary key columns for source table: %w", fromPrimaryKeysErr)
	}

	// Get primary key columns for destination table
	toPrimaryKeys, toPrimaryKeysErr := getPrimaryKeyColumns(ctx, tx, toTable)
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
		`SELECT %s FROM %s WHERE %s`,
		quoteIdentifier(fromColumnName), quoteIdentifier(fromTable), fromWhereClause,
	)
	var columnValue any
	if queryRowErr := tx.QueryRow(ctx, selectSQL, fromWhereArgs...).Scan(&columnValue); queryRowErr != nil {
		return fmt.Errorf("failed to retrieve source column for copy: %w", queryRowErr)
	}

	// 2) Write the retrieved value into the destination column
	updateDestSQL := fmt.Sprintf(
		`UPDATE %s SET %s = $1 WHERE %s`,
		quoteIdentifier(toTable), quoteIdentifier(toColumnName), toWhereClause,
	)
	args := append([]any{columnValue}, toWhereArgs...)
	if _, execErr := tx.Exec(ctx, updateDestSQL, args...); execErr != nil {
		return fmt.Errorf("failed to write destination column in copy: %w", execErr)
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
	// Get primary key columns for source table
	fromPrimaryKeys, fromPrimaryKeysErr := getPrimaryKeyColumns(ctx, tx, fromTable)
	if fromPrimaryKeysErr != nil {
		return fmt.Errorf("failed to get primary key columns for source table: %w", fromPrimaryKeysErr)
	}

	// Get primary key columns for destination table
	toPrimaryKeys, toPrimaryKeysErr := getPrimaryKeyColumns(ctx, tx, toTable)
	if toPrimaryKeysErr != nil {
		return fmt.Errorf("failed to get primary key columns for destination table: %w", toPrimaryKeysErr)
	}

	// Build WHERE clause for source
	fromWhereClause, fromWhereArgs, fromWhereClauseErr := buildWhereClause(fromPrimaryKeys, fromRowID)
	if fromWhereClauseErr != nil {
		return fmt.Errorf("failed to build FROM WHERE clause: %w", fromWhereClauseErr)
	}

	// 1) SELECT * from the source row
	selectSQL := fmt.Sprintf(`SELECT * FROM %s WHERE %s`, quoteIdentifier(fromTable), fromWhereClause)
	rows, queryErr := tx.Query(ctx, selectSQL, fromWhereArgs...)
	if queryErr != nil {
		return fmt.Errorf("failed to retrieve source row for copy: %w", queryErr)
	}
	defer rows.Close()

	if !rows.Next() {
		return fmt.Errorf("no row found with id=%v in table %s", fromRowID, fromTable)
	}

	fieldDescriptions := rows.FieldDescriptions()
	values, valuesErr := rows.Values()
	if valuesErr != nil {
		return fmt.Errorf("failed to read row data: %w", valuesErr)
	}

	rowData := make(map[string]any, len(fieldDescriptions))
	for i, fd := range fieldDescriptions {
		rowData[fd.Name] = values[i]
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

	columns := make([]string, 0, len(rowData))
	placeholders := make([]string, 0, len(rowData))
	args := make([]any, 0, len(rowData))

	paramIndex := 1
	for col, val := range rowData {
		columns = append(columns, quoteIdentifier(col))
		placeholders = append(placeholders, fmt.Sprintf("$%d", paramIndex))
		args = append(args, val)
		paramIndex++
	}

	insertSQL := fmt.Sprintf(
		`INSERT INTO %s (%s) VALUES (%s)`,
		quoteIdentifier(toTable),
		strings.Join(columns, ", "),
		strings.Join(placeholders, ", "),
	)
	if _, execErr := tx.Exec(ctx, insertSQL, args...); execErr != nil {
		return fmt.Errorf("failed to insert row into destination table in copy: %w", execErr)
	}

	return nil
}
