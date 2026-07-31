package utils

import (
	"strings"
)

const (
	// Path segment counts.
	tableOnlySegments     = 1
	databaseTableSegments = 2
	rowSegments           = 3
)

// ConstructPath takes a database name, table name, row identifier, and column name
// and returns a path matching the format used by ExtractPathComponents.
// Example: "/myDatabase/myTable.json/42/name".
func ConstructPath(databaseName, tableName, rowIdentifier, columnName string) string {
	var parts []string

	// 1) Database name (if not empty)
	if databaseName != "" {
		parts = append(parts, databaseName)
	}

	// 2) Table name, appended with ".json" (if not empty)
	if tableName != "" {
		parts = append(parts, tableName+".json")
	}

	// 3) Row identifier (if not empty)
	if rowIdentifier != "" {
		parts = append(parts, rowIdentifier)
	}

	// 4) Column name (if not empty)
	if columnName != "" {
		parts = append(parts, columnName)
	}

	// Join them with "/"
	return strings.Join(parts, "/")
}

// ExtractPathComponents splits a path like:
//
//	"/database1/users.json/0/name"
//
// into its components:
//
//	databaseName, tableName, rowIdentifier, columnName
//
// It handles:
//
//   - a single segment (e.g. "users.json") → tableName="users"
//   - two segments ("db/users.json") → databaseName="db", tableName="users"
//   - three segments (.../0)      → adds rowIdentifier="0"
//   - four+ segments (.../name/extra) → columnName="name" (extras ignored)
//
// Returns empty strings for any missing component.
func ExtractPathComponents(pathStr string) (string, string, string, string) {
	// trim whitespace and any leading/trailing slashes
	clean := strings.TrimSpace(pathStr)
	clean = strings.Trim(clean, "/")

	if clean == "" {
		return "", "", "", ""
	}

	parts := strings.Split(clean, "/")

	switch len(parts) {
	case tableOnlySegments:
		// only table
		return "", strings.TrimSuffix(parts[0], ".json"), "", ""
	case databaseTableSegments:
		// database + table
		return parts[0], strings.TrimSuffix(parts[1], ".json"), "", ""
	case rowSegments:
		// database + table + row
		return parts[0], strings.TrimSuffix(parts[1], ".json"), parts[2], ""
	default:
		// database + table + row + column (ignore extras)
		return parts[0], strings.TrimSuffix(parts[1], ".json"), parts[2], parts[3]
	}
}
