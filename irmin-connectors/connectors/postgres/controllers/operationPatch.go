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
	default:
		return errors.New("invalid operation type: " + op.Op + " (move/copy operations not implemented yet)")
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
