package mysqlcontrollers

import (
	"context"
	"errors"
	"fmt"
	"strings"

	mysqlclient "irmin-connectors/connectors/mysql/client"
)

// escapeIdentifier escapes MySQL identifiers (table names, column names) to prevent SQL injection.
func escapeIdentifier(identifier string) string {
	// Escape backticks by doubling them and wrap in backticks
	return "`" + strings.ReplaceAll(identifier, "`", "``") + "`"
}

// escapeIdentifiers wraps each identifier in backticks and escapes embedded backticks to prevent SQL injection.
//
// cols is a slice of unquoted column names, out is a new slice where each name is properly escaped.
func escapeIdentifiers(cols []string) []string {
	out := make([]string, len(cols))
	for i, c := range cols {
		out[i] = escapeIdentifier(c)
	}
	return out
}

// getPrimaryKeyColumns returns the primary key columns for a given table.
func getPrimaryKeyColumns(ctx context.Context, tx *mysqlclient.Tx, tableName string) ([]string, error) {
	query := `
		SELECT COLUMN_NAME 
		FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
		WHERE TABLE_SCHEMA = DATABASE() 
		AND TABLE_NAME = ? 
		AND CONSTRAINT_NAME = 'PRIMARY'
		ORDER BY ORDINAL_POSITION
	`

	rows, err := tx.Query(ctx, query, tableName)
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

	// If no primary key, try to find any unique key
	if len(columns) == 0 {
		// Query for any unique key - remove LIMIT 1 to get all columns of composite unique keys
		uniqueQuery := `
			SELECT COLUMN_NAME 
			FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
			WHERE TABLE_SCHEMA = DATABASE() 
			AND TABLE_NAME = ? 
			AND CONSTRAINT_NAME != 'PRIMARY'
			ORDER BY CONSTRAINT_NAME, ORDINAL_POSITION
		`

		uniqueRows, uniqueErr := tx.Query(ctx, uniqueQuery, tableName)
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

	// If still no unique identifier found, we cannot create meaningful operations
	if len(columns) == 0 {
		return nil, fmt.Errorf(
			"table %s has no primary key or unique key - cannot perform operations that require row identification",
			tableName,
		)
	}

	return columns, nil
}

// buildWhereClause builds a WHERE clause for the given primary key columns and row identifier.
func buildWhereClause(primaryKeys []string, rowIdentifier any) (string, []any, error) {
	if len(primaryKeys) == 0 {
		return "", nil, errors.New("no primary key columns provided")
	}

	if len(primaryKeys) == 1 {
		// Single primary key
		whereClause := fmt.Sprintf("%s = ?", escapeIdentifier(primaryKeys[0]))
		return whereClause, []any{rowIdentifier}, nil
	}

	// Composite primary key - expect string format like "value1:value2:value3"
	rowIDStr, ok := rowIdentifier.(string)
	if !ok {
		return "", nil, errors.New("composite primary key requires string identifier in format 'value1:value2:...'")
	}

	parts := strings.Split(rowIDStr, ":")
	if len(parts) != len(primaryKeys) {
		return "", nil, fmt.Errorf(
			"identifier parts (%d) don't match primary key columns (%d)",
			len(parts), len(primaryKeys),
		)
	}

	var conditions []string
	var args []any

	for i, key := range primaryKeys {
		conditions = append(conditions, fmt.Sprintf("%s = ?", escapeIdentifier(key)))
		args = append(args, parts[i])
	}

	whereClause := strings.Join(conditions, " AND ")
	return whereClause, args, nil
}

// processTableName extracts the table name from a file path.
// It safely handles nil databaseName pointer.
func processTableName(filePath string, databaseName *string) string {
	tableName := strings.TrimSuffix(filePath, ".json")
	tableName = strings.Trim(tableName, "/")

	// Safe dereference of databaseName pointer
	if databaseName != nil {
		tableName = strings.TrimPrefix(tableName, *databaseName)
	}

	tableName = strings.Trim(tableName, "/")
	return tableName
}

// processRawPath processes a raw path string using database-specific logic.
// This is used by providers in the new architecture where form parsing is done by the common framework.
func processRawPath(rawPath string, databaseName *string) string {
	path := strings.TrimSuffix(rawPath, ".json")
	path = strings.Trim(path, "/")

	// Safe dereference of databaseName pointer
	if databaseName != nil {
		path = strings.TrimPrefix(path, *databaseName)
	}

	path = strings.Trim(path, "/")
	return path
}
