package mysqlcontrollers

import (
	"errors"
	"fmt"
	"irmin-connectors/connectors/common"
	mysqlclient "irmin-connectors/connectors/mysql/client"
	"irmin-connectors/db"
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
) error {
	dbClient, ok := client.(*mysqlclient.MySQLClient)
	if !ok {
		return errors.New("invalid client type for MySQL patch provider")
	}

	return executePatchOperation(c, dbClient, op, tableName, rowIdentifier, columnName)
}

// OperationPatch handles the "patch" operation using the common framework.
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
	default:
		return fmt.Errorf("invalid operation type: %s (move/copy operations not implemented yet)", op.Op)
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
