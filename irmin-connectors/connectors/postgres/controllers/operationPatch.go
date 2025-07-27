package postgrescontrollers

import (
	"errors"
	"fmt"
	"irmin-connectors/connectors/common"
	postgresclient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/db"
	"log/slog"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
	"irmin-connectors/utils"
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
) error {
	dbClient, ok := client.(*postgresclient.PostgresClient)
	if !ok {
		return errors.New("invalid client type for PostgreSQL patch provider")
	}

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

	// Handle the operation based on its type
	var err error
	switch op.Op {
	case "add":
		err = handleAddOperation(c, tx, tableName, op.Value)
	case "remove":
		err = handleRemoveOperation(c, tx, tableName, rowIdentifier)
	case "replace":
		err = handleReplaceOperation(c, tx, tableName, rowIdentifier, columnName, op.Value)
	case "copy":
		err = handleCopyOperation(c, tx, tableName, rowIdentifier, columnName, op)
	case "move":
		err = handleMoveOperation(c, tx, tableName, rowIdentifier, columnName, op)
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

// OperationPatch handles the "patch" operation using the common framework.
func (cs *Controllers) OperationPatch(c fiber.Ctx) error {
	provider := &PostgresPatchProvider{}
	return common.HandleOperationPatch(c, provider, cs.Logger)
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

// handleCopyOperation handles the "copy" patch operation.
func handleCopyOperation(
	c fiber.Ctx,
	tx *postgresclient.Tx,
	tableName string,
	rowIdentifier any,
	columnName string,
	op irminmodels.PatchOperation,
) error {
	// Extract source path components
	if op.From == nil {
		return errors.New("copy operation requires 'from' field")
	}
	_, sourceTableName, sourceRowIdentifier, sourceColumnName := utils.ExtractPathComponents(*op.From)

	if columnName != "" && sourceColumnName != "" {
		// Column-level copy
		return handleColumnCopy(c, tx, tableName, rowIdentifier, columnName, sourceTableName, sourceRowIdentifier, sourceColumnName)
	} else {
		// Row-level copy
		return handleRowCopy(c, tx, tableName, rowIdentifier, sourceTableName, sourceRowIdentifier)
	}
}

// handleMoveOperation handles the "move" patch operation.
func handleMoveOperation(
	c fiber.Ctx,
	tx *postgresclient.Tx,
	tableName string,
	rowIdentifier any,
	columnName string,
	op irminmodels.PatchOperation,
) error {
	// Extract source path components
	if op.From == nil {
		return errors.New("move operation requires 'from' field")
	}
	_, sourceTableName, sourceRowIdentifier, sourceColumnName := utils.ExtractPathComponents(*op.From)

	if columnName != "" && sourceColumnName != "" {
		// Column-level move: copy then set source to NULL
		if err := handleColumnCopy(c, tx, tableName, rowIdentifier, columnName, sourceTableName, sourceRowIdentifier, sourceColumnName); err != nil {
			return err
		}
		// Set source column to NULL
		return handleReplaceOperation(c, tx, sourceTableName, sourceRowIdentifier, sourceColumnName, nil)
	} else {
		// Row-level move: copy then remove source
		if err := handleRowCopy(c, tx, tableName, rowIdentifier, sourceTableName, sourceRowIdentifier); err != nil {
			return err
		}
		// Remove source row
		return handleRemoveOperation(c, tx, sourceTableName, sourceRowIdentifier)
	}
}

// handleColumnCopy copies a single column value from source to destination using dynamic primary keys.
func handleColumnCopy(
	c fiber.Ctx,
	tx *postgresclient.Tx,
	destTableName string,
	destRowIdentifier any,
	destColumnName string,
	sourceTableName string,
	sourceRowIdentifier any,
	sourceColumnName string,
) error {
	// Get primary key columns for source table
	sourcePrimaryKeys, err := getPrimaryKeyColumns(c, tx, sourceTableName)
	if err != nil {
		return fmt.Errorf("failed to get source table primary key columns: %w", err)
	}

	// Build WHERE clause for source row using dynamic primary keys
	sourceWhereClause, sourceWhereArgs, err := buildWhereClause(sourcePrimaryKeys, sourceRowIdentifier)
	if err != nil {
		return fmt.Errorf("failed to build source WHERE clause: %w", err)
	}

	// Get the value from source column
	selectSQL := fmt.Sprintf(
		`SELECT %s FROM %s WHERE %s`,
		quoteIdentifier(sourceColumnName),
		quoteIdentifier(sourceTableName),
		sourceWhereClause,
	)

	var sourceValue any
	if err := tx.QueryRow(c, selectSQL, sourceWhereArgs...).Scan(&sourceValue); err != nil {
		return fmt.Errorf("failed to read source column value: %w", err)
	}

	// Get primary key columns for destination table
	destPrimaryKeys, err := getPrimaryKeyColumns(c, tx, destTableName)
	if err != nil {
		return fmt.Errorf("failed to get destination table primary key columns: %w", err)
	}

	// Build WHERE clause for destination row using dynamic primary keys
	destWhereClause, destWhereArgs, err := buildWhereClause(destPrimaryKeys, destRowIdentifier)
	if err != nil {
		return fmt.Errorf("failed to build destination WHERE clause: %w", err)
	}

	// Update the destination column
	updateSQL := fmt.Sprintf(
		`UPDATE %s SET %s = $1 WHERE %s`,
		quoteIdentifier(destTableName),
		quoteIdentifier(destColumnName),
		destWhereClause,
	)
	args := append([]any{sourceValue}, destWhereArgs...)

	if _, err := tx.Exec(c, updateSQL, args...); err != nil {
		return fmt.Errorf("failed to update destination column: %w", err)
	}

	return nil
}

// handleRowCopy copies an entire row from source to destination using dynamic primary keys.
func handleRowCopy(
	c fiber.Ctx,
	tx *postgresclient.Tx,
	destTableName string,
	destRowIdentifier any,
	sourceTableName string,
	sourceRowIdentifier any,
) error {
	// Get primary key columns for source table
	sourcePrimaryKeys, err := getPrimaryKeyColumns(c, tx, sourceTableName)
	if err != nil {
		return fmt.Errorf("failed to get source table primary key columns: %w", err)
	}

	// Build WHERE clause for source row using dynamic primary keys
	sourceWhereClause, sourceWhereArgs, err := buildWhereClause(sourcePrimaryKeys, sourceRowIdentifier)
	if err != nil {
		return fmt.Errorf("failed to build source WHERE clause: %w", err)
	}

	// Get all column names for the source table (excluding primary keys for destination)
	getColumnsSQL := `
		SELECT column_name 
		FROM information_schema.columns 
		WHERE table_name = $1 AND table_schema = current_schema()
		ORDER BY ordinal_position
	`

	rows, err := tx.Query(c, getColumnsSQL, sourceTableName)
	if err != nil {
		return fmt.Errorf("failed to get column names: %w", err)
	}
	defer rows.Close()

	var columns []string
	for rows.Next() {
		var columnName string
		if err := rows.Scan(&columnName); err != nil {
			return fmt.Errorf("failed to scan column name: %w", err)
		}
		columns = append(columns, columnName)
	}

	if len(columns) == 0 {
		return errors.New("no columns found in source table")
	}

	// Select all data from source row
	selectSQL := fmt.Sprintf(
		`SELECT %s FROM %s WHERE %s`,
		strings.Join(quoteIdentifiers(columns), ", "),
		quoteIdentifier(sourceTableName),
		sourceWhereClause,
	)

	sourceRow := tx.QueryRow(c, selectSQL, sourceWhereArgs...)
	
	// Prepare scan destinations
	values := make([]any, len(columns))
	scanArgs := make([]any, len(columns))
	for i := range values {
		scanArgs[i] = &values[i]
	}

	if err := sourceRow.Scan(scanArgs...); err != nil {
		return fmt.Errorf("failed to scan source row: %w", err)
	}

	// Get primary key columns for destination table
	destPrimaryKeys, err := getPrimaryKeyColumns(c, tx, destTableName)
	if err != nil {
		return fmt.Errorf("failed to get destination table primary key columns: %w", err)
	}

	// Build WHERE clause for destination row using dynamic primary keys
	destWhereClause, destWhereArgs, err := buildWhereClause(destPrimaryKeys, destRowIdentifier)
	if err != nil {
		return fmt.Errorf("failed to build destination WHERE clause: %w", err)
	}

	// Build UPDATE statement for all non-primary key columns
	var setClauses []string
	var updateArgs []any
	paramIndex := 1

	for i, col := range columns {
		// Skip primary key columns to avoid conflicts
		isPrimaryKey := false
		for _, pk := range destPrimaryKeys {
			if col == pk {
				isPrimaryKey = true
				break
			}
		}
		
		if !isPrimaryKey {
			setClauses = append(setClauses, fmt.Sprintf(`%s = $%d`, quoteIdentifier(col), paramIndex))
			updateArgs = append(updateArgs, values[i])
			paramIndex++
		}
	}

	if len(setClauses) == 0 {
		return errors.New("no non-primary key columns to update")
	}

	updateSQL := fmt.Sprintf(
		`UPDATE %s SET %s WHERE %s`,
		quoteIdentifier(destTableName),
		strings.Join(setClauses, ", "),
		destWhereClause,
	)

	// Append WHERE arguments
	updateArgs = append(updateArgs, destWhereArgs...)

	if _, err := tx.Exec(c, updateSQL, updateArgs...); err != nil {
		return fmt.Errorf("failed to update destination row: %w", err)
	}

	return nil
}
