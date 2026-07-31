package mysqlclient

import (
	"context"
	"fmt"
	"strings"
)

// SetupChangeTracking sets up MySQL triggers for change tracking on all tables.
func SetupChangeTracking(dbClient *MySQLClient) error {
	ctx := context.Background()

	// First, create the change log table if it doesn't exist
	if err := dbClient.createChangeLogTable(ctx); err != nil {
		return fmt.Errorf("failed to create change log table: %w", err)
	}

	// Get all tables in the current database
	tables, err := dbClient.GetTables(ctx)
	if err != nil {
		return fmt.Errorf("failed to get tables: %w", err)
	}

	// Create triggers for each table
	for _, tableName := range tables {
		if createErr := dbClient.createTriggersForTable(ctx, tableName); createErr != nil {
			return fmt.Errorf("failed to create triggers for table %s: %w", tableName, createErr)
		}
	}

	return nil
}

// createChangeLogTable creates a table to log all changes.
func (mc *MySQLClient) createChangeLogTable(ctx context.Context) error {
	query := `
		CREATE TABLE IF NOT EXISTS irmin_change_log (
			id BIGINT AUTO_INCREMENT PRIMARY KEY,
			table_name VARCHAR(255) NOT NULL,
			operation_type ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
			row_id VARCHAR(255) NOT NULL,
			changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_table_changed (table_name, changed_at),
			INDEX idx_changed_at (changed_at)
		) ENGINE=InnoDB;
	`
	_, err := mc.Exec(ctx, query)
	return err
}

// escapeIdentifier escapes MySQL identifiers (table names, column names) to prevent SQL injection.
func escapeIdentifier(identifier string) string {
	// Escape backticks by doubling them and wrap in backticks
	return "`" + strings.ReplaceAll(identifier, "`", "``") + "`"
}

// getPrimaryKeyColumns returns the primary key columns for a table.
func (mc *MySQLClient) getPrimaryKeyColumns(ctx context.Context, tableName string) ([]string, error) {
	query := `
		SELECT COLUMN_NAME 
		FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
		WHERE TABLE_SCHEMA = DATABASE() 
		AND TABLE_NAME = ? 
		AND CONSTRAINT_NAME = 'PRIMARY'
		ORDER BY ORDINAL_POSITION
	`

	rows, err := mc.Query(ctx, query, tableName)
	if err != nil {
		return nil, fmt.Errorf("failed to query primary key columns: %w", err)
	}
	defer rows.Close()

	var columns []string
	for rows.Next() {
		var columnName string
		if scanErr := rows.Scan(&columnName); scanErr != nil {
			return nil, fmt.Errorf("failed to scan column name: %w", scanErr)
		}
		columns = append(columns, columnName)
	}

	if rowsErr := rows.Err(); rowsErr != nil {
		return nil, fmt.Errorf("error reading rows: %w", rowsErr)
	}

	// If no primary key, try to find any unique key or use all columns as fallback
	if len(columns) == 0 {
		// Query for any unique key
		uniqueQuery := `
			SELECT COLUMN_NAME 
			FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
			WHERE TABLE_SCHEMA = DATABASE() 
			AND TABLE_NAME = ? 
			AND CONSTRAINT_NAME != 'PRIMARY'
			ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION
		`

		uniqueRows, uniqueErr := mc.Query(ctx, uniqueQuery, tableName)
		if uniqueErr != nil {
			return nil, fmt.Errorf("failed to query unique key columns: %w", uniqueErr)
		}
		defer uniqueRows.Close()

		for uniqueRows.Next() {
			var columnName string
			if scanErr := uniqueRows.Scan(&columnName); scanErr != nil {
				return nil, fmt.Errorf("failed to scan unique column name: %w", scanErr)
			}
			columns = append(columns, columnName)
		}

		if rowsErr := uniqueRows.Err(); rowsErr != nil {
			return nil, fmt.Errorf("error reading unique key rows: %w", rowsErr)
		}
	}

	// If still no unique identifier found, we cannot create meaningful triggers
	if len(columns) == 0 {
		return nil, fmt.Errorf(
			"table %s has no primary key or unique key - cannot create change tracking triggers",
			tableName,
		)
	}

	return columns, nil
}

// buildRowIdentifier creates a CONCAT expression for the primary key columns.
func buildRowIdentifier(columns []string, prefix string) string {
	if len(columns) == 0 {
		return "''"
	}

	if len(columns) == 1 {
		return fmt.Sprintf("COALESCE(CAST(%s.%s AS CHAR), '')", prefix, escapeIdentifier(columns[0]))
	}

	var parts []string
	for i, col := range columns {
		if i > 0 {
			parts = append(parts, "':'")
		}
		parts = append(parts, fmt.Sprintf("COALESCE(CAST(%s.%s AS CHAR), '')", prefix, escapeIdentifier(col)))
	}

	return fmt.Sprintf("CONCAT(%s)", strings.Join(parts, ", "))
}

// createTriggersForTable creates INSERT, UPDATE, and DELETE triggers for a table.
func (mc *MySQLClient) createTriggersForTable(ctx context.Context, tableName string) error {
	// Drop existing triggers first
	if err := mc.dropTriggersForTable(ctx, tableName); err != nil {
		return err
	}

	// Get primary key columns for this table
	primaryKeys, err := mc.getPrimaryKeyColumns(ctx, tableName)
	if err != nil {
		return fmt.Errorf("failed to get primary key columns for table %s: %w", tableName, err)
	}

	// Escape table name and trigger names to prevent SQL injection
	escapedTableName := escapeIdentifier(tableName)
	escapedInsertTrigger := escapeIdentifier(tableName + "_irmin_insert")
	escapedUpdateTrigger := escapeIdentifier(tableName + "_irmin_update")
	escapedDeleteTrigger := escapeIdentifier(tableName + "_irmin_delete")

	// Build row identifier expressions
	newRowID := buildRowIdentifier(primaryKeys, "NEW")
	oldRowID := buildRowIdentifier(primaryKeys, "OLD")

	// Create INSERT trigger
	insertTrigger := fmt.Sprintf(`
		CREATE TRIGGER %s
		AFTER INSERT ON %s
		FOR EACH ROW
		INSERT INTO irmin_change_log (table_name, operation_type, row_id)
		VALUES ('%s', 'INSERT', %s)
	`, escapedInsertTrigger, escapedTableName, strings.ReplaceAll(tableName, "'", "''"), newRowID)

	if _, insertErr := mc.Exec(ctx, insertTrigger); insertErr != nil {
		return fmt.Errorf("failed to create INSERT trigger: %w", insertErr)
	}

	// Create UPDATE trigger
	updateTrigger := fmt.Sprintf(`
		CREATE TRIGGER %s
		AFTER UPDATE ON %s
		FOR EACH ROW
		INSERT INTO irmin_change_log (table_name, operation_type, row_id)
		VALUES ('%s', 'UPDATE', %s)
	`, escapedUpdateTrigger, escapedTableName, strings.ReplaceAll(tableName, "'", "''"), newRowID)

	if _, updateErr := mc.Exec(ctx, updateTrigger); updateErr != nil {
		return fmt.Errorf("failed to create UPDATE trigger: %w", updateErr)
	}

	// Create DELETE trigger
	deleteTrigger := fmt.Sprintf(`
		CREATE TRIGGER %s
		AFTER DELETE ON %s
		FOR EACH ROW
		INSERT INTO irmin_change_log (table_name, operation_type, row_id)
		VALUES ('%s', 'DELETE', %s)
	`, escapedDeleteTrigger, escapedTableName, strings.ReplaceAll(tableName, "'", "''"), oldRowID)

	if _, deleteErr := mc.Exec(ctx, deleteTrigger); deleteErr != nil {
		return fmt.Errorf("failed to create DELETE trigger: %w", deleteErr)
	}

	return nil
}

// dropTriggersForTable removes all Irmin triggers for a specific table.
func (mc *MySQLClient) dropTriggersForTable(ctx context.Context, tableName string) error {
	// Use escaped trigger names to prevent SQL injection
	triggerNames := []string{
		tableName + "_irmin_insert",
		tableName + "_irmin_update",
		tableName + "_irmin_delete",
	}

	for _, triggerName := range triggerNames {
		escapedTriggerName := escapeIdentifier(triggerName)
		dropQuery := fmt.Sprintf("DROP TRIGGER IF EXISTS %s", escapedTriggerName)
		if _, err := mc.Exec(ctx, dropQuery); err != nil {
			return fmt.Errorf("failed to drop trigger %s: %w", triggerName, err)
		}
	}

	return nil
}

// RemoveAllChangeTracking removes all Irmin change tracking infrastructure.
func RemoveAllChangeTracking(dbClient *MySQLClient) error {
	ctx := context.Background()

	// Get all tables
	tables, err := dbClient.GetTables(ctx)
	if err != nil {
		return fmt.Errorf("failed to get tables: %w", err)
	}

	// Remove triggers for each table
	for _, tableName := range tables {
		if dropErr := dbClient.dropTriggersForTable(ctx, tableName); dropErr != nil {
			return fmt.Errorf("failed to drop triggers for table %s: %w", tableName, dropErr)
		}
	}

	// Drop the change log table
	if _, dropErr := dbClient.Exec(ctx, "DROP TABLE IF EXISTS irmin_change_log"); dropErr != nil {
		return fmt.Errorf("failed to drop change log table: %w", dropErr)
	}

	return nil
}
