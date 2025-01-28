package utils

import (
	"strings"
)

// ExtractPathComponents takes a path like "/database1/users.json/0/name"
// and returns each piece: (databaseName, tableName, rowIdentifier, columnName).
func ExtractPathComponents(path string) (databaseName, tableName, rowIdentifier, columnName string) {
	// Trim whitespace and any leading slash
	path = strings.TrimSpace(path)
	path = strings.TrimPrefix(path, "/")

	// Split into parts by slash
	parts := strings.Split(path, "/")

	// If no parts, nothing to do
	if len(parts) == 0 {
		return
	}

	// 1) The first part is (likely) the database name
	databaseName = parts[0]

	// 2) The second part, if present, should be the table name.
	//    Since JSON-based APIs often store tables as "something.json",
	//    we can remove ".json".
	if len(parts) >= 2 {
		tableName = strings.TrimSuffix(parts[1], ".json")
	}

	// 3) The third part, if present, might be the row identifier (e.g., 0, 42, or some ID)
	if len(parts) >= 3 {
		rowIdentifier = parts[2]
	}

	// 4) The fourth part, if present, might be the column name
	if len(parts) >= 4 {
		columnName = parts[3]
	}

	return
}
