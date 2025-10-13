package engine

import (
	"context"
	"fmt"
	"irmin-api/duckdb"
	"irmin-api/utils"
	"os"
	"path/filepath"
	"strings"
)

// SchemaField represents one column or nested field in the DuckDB schema.
// Name is the column name or nested field name.
// Type is the DuckDB data type (e.g. "VARCHAR", "STRUCT", or "ARRAY<STRUCT>").
// Required indicates whether the field is non-nullable in DuckDB (is_nullable = 'NO').
// Children holds nested struct fields if this column is a STRUCT or array of STRUCTs.
type SchemaField struct {
	Name     string        `json:"name"`
	Type     string        `json:"type"`
	Required bool          `json:"required"`
	Children []SchemaField `json:"children,omitempty"`
}

// minFieldParts is the minimum number of parts required for a valid field definition
// (name and type).
const minFieldParts = 2

// splitTopLevelComma splits a STRUCT(...) definition by commas at top-level only,
// ignoring commas inside nested parentheses.
func splitTopLevelComma(s string) []string {
	var parts []string
	var buf strings.Builder
	depth := 0
	for _, r := range s {
		switch r {
		case '(':
			depth++
			buf.WriteRune(r)
		case ')':
			depth--
			buf.WriteRune(r)
		case ',':
			if depth == 0 {
				parts = append(parts, buf.String())
				buf.Reset()
			} else {
				buf.WriteRune(r)
			}
		default:
			buf.WriteRune(r)
		}
	}
	if buf.Len() > 0 {
		parts = append(parts, buf.String())
	}
	return parts
}

// parseField constructs a SchemaField recursively from its name, type and required flag.
func parseField(name, typ string, required bool) SchemaField {
	// handle array of structs
	if strings.HasPrefix(typ, "STRUCT(") && strings.HasSuffix(typ, ")[]") {
		// treat as array of struct
		nested := typ[len("STRUCT(") : len(typ)-3] // drop STRUCT( ... )[]
		fields := splitTopLevelComma(nested)
		children := make([]SchemaField, 0, len(fields))
		for _, f := range fields {
			parts := strings.Fields(strings.TrimSpace(f))
			if len(parts) < minFieldParts {
				continue
			}
			childName := parts[0]
			childType := strings.Join(parts[1:], " ")
			children = append(children, parseField(childName, childType, required))
		}
		return SchemaField{Name: name, Type: "ARRAY<STRUCT>", Required: required, Children: children}
	}
	// handle struct
	if strings.HasPrefix(typ, "STRUCT(") && strings.HasSuffix(typ, ")") {
		nested := typ[len("STRUCT(") : len(typ)-1]
		fields := splitTopLevelComma(nested)
		children := make([]SchemaField, 0, len(fields))
		for _, f := range fields {
			parts := strings.Fields(strings.TrimSpace(f))
			if len(parts) < minFieldParts {
				continue
			}
			childName := parts[0]
			childType := strings.Join(parts[1:], " ")
			children = append(children, parseField(childName, childType, required))
		}
		return SchemaField{Name: name, Type: "STRUCT", Required: required, Children: children}
	}
	// primitive or other types
	return SchemaField{Name: name, Type: typ, Required: required}
}

// getDuckDBSchema runs DuckDB introspection on a structured file and returns a schema with required flags.
// Supports multiple formats including JSON, CSV, Parquet, Avro, ORC, Excel, and more.
// Steps:
//   - create a temp view using the appropriate DuckDB read function for the file format
//   - query information_schema.columns for column_name, data_type, is_nullable
//   - parse each into SchemaField, setting Required = is_nullable == "NO"
//     and recursively parse STRUCT fields.
func getDuckDBSchema(
	ctx context.Context,
	c *Client,
	env *utils.CoreAPIEnv,
	userWorkspace, repository, path, ref string,
) ([]SchemaField, error) {
	qc, newQueryClientErr := duckdb.NewQueryClient(ctx, env, c.Logger)
	if newQueryClientErr != nil {
		return nil, fmt.Errorf("failed to create DuckDB client: %w", newQueryClientErr)
	}
	defer qc.Close()

	// build and parse placeholder SELECT
	simple := fmt.Sprintf(`SELECT * FROM $["%s;%s@%s"];`, repository, path, ref)
	parsed, parseIrminQueryErr := parseIrminQuery(c, userWorkspace, simple)
	if parseIrminQueryErr != nil {
		return nil, fmt.Errorf("failed to parse query: %w", parseIrminQueryErr)
	}
	selector := parsed.Placeholders[0].Replacer

	// create temp view
	viewSQL := fmt.Sprintf(
		"CREATE OR REPLACE TEMPORARY VIEW table_view AS SELECT * FROM %s;",
		selector,
	)
	if _, executeNonQueryErr := qc.ExecuteNonQuery(ctx, viewSQL); executeNonQueryErr != nil {
		return nil, fmt.Errorf("failed to create view: %w", executeNonQueryErr)
	}

	// Use the shared schema extraction logic
	return extractSchemaFromView(ctx, qc)
}

// extractSchemaFromView extracts schema information from a DuckDB view named 'table_view'.
// This is shared logic used by both getDuckDBSchema and getDuckDBSchemaFromLocalFile.
func extractSchemaFromView(ctx context.Context, qc *duckdb.QueryClient) ([]SchemaField, error) {
	// Fetch schema with nullability
	rows, executeQueryErr := qc.ExecuteQuery(ctx, `
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='main' AND table_name='table_view'
`)
	if executeQueryErr != nil {
		return nil, fmt.Errorf("failed to fetch schema: %w", executeQueryErr)
	}
	if rows.Err() != nil {
		return nil, fmt.Errorf("failed to fetch schema: %w", rows.Err())
	}
	defer rows.Close()

	var result []SchemaField
	for rows.Next() {
		var name, typ, nullable string
		if scanErr := rows.Scan(&name, &typ, &nullable); scanErr != nil {
			return nil, fmt.Errorf("failed to scan schema row: %w", scanErr)
		}
		required := strings.EqualFold(nullable, "NO")
		result = append(result, parseField(name, typ, required))
	}
	return result, nil
}

// getDuckDBSchemaFromLocalFile runs DuckDB introspection on a local file.
// It saves the file data to a temporary location and analyzes it with DuckDB.
func getDuckDBSchemaFromLocalFile(
	ctx context.Context,
	c *Client,
	env *utils.CoreAPIEnv,
	filename string,
	fileData []byte,
) ([]SchemaField, error) {
	// Create a temporary directory for the file
	tempDir, err := os.MkdirTemp("", "irmin-schema-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tempDir)

	// Save the file to the temporary directory
	// Use filepath.Base to prevent path traversal attacks
	safeFilename := filepath.Base(filename)
	tempFilePath := filepath.Join(tempDir, safeFilename)
	if writeErr := os.WriteFile(tempFilePath, fileData, 0600); writeErr != nil {
		return nil, fmt.Errorf("failed to write temp file: %w", writeErr)
	}

	qc, newQueryClientErr := duckdb.NewQueryClient(ctx, env, c.Logger)
	if newQueryClientErr != nil {
		return nil, fmt.Errorf("failed to create DuckDB client: %w", newQueryClientErr)
	}
	defer qc.Close()

	// Determine the read function based on file extension
	readFunction := getDuckDBReadFunction(safeFilename)

	// Create temp view from the file
	viewSQL := fmt.Sprintf(
		"CREATE OR REPLACE TEMPORARY VIEW table_view AS SELECT * FROM %s('%s');",
		readFunction,
		tempFilePath,
	)
	if _, executeNonQueryErr := qc.ExecuteNonQuery(ctx, viewSQL); executeNonQueryErr != nil {
		return nil, fmt.Errorf("failed to create view: %w", executeNonQueryErr)
	}

	// Use the shared schema extraction logic
	return extractSchemaFromView(ctx, qc)
}
