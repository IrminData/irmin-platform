package engine

import (
	"fmt"
	"irmin-api/duckdb"
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
			if len(parts) < 2 {
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
			if len(parts) < 2 {
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

// getDuckDBSchema runs DuckDB introspection on a JSON file and returns a schema with required flags.
// Steps:
//   - create a temp view via read_json_auto placeholder
//   - query information_schema.columns for column_name, data_type, is_nullable
//   - parse each into SchemaField, setting Required = is_nullable == "NO"
//     and recursively parse STRUCT fields.
func getDuckDBSchema(
	c *Client,
	userWorkspace, repository, path, ref string,
) ([]SchemaField, error) {
	qc, err := duckdb.NewQueryClient()
	if err != nil {
		return nil, fmt.Errorf("failed to create DuckDB client: %w", err)
	}
	defer qc.Close()

	// build and parse placeholder SELECT
	simple := fmt.Sprintf(`SELECT * FROM $["%s;%s@%s"];`, repository, path, ref)
	parsed, err := parseIrminQuery(c, userWorkspace, simple)
	if err != nil {
		return nil, fmt.Errorf("failed to parse query: %w", err)
	}
	selector := parsed.Placeholders[0].Replacer

	// create temp view
	viewSQL := fmt.Sprintf(
		"CREATE OR REPLACE TEMPORARY VIEW table_view AS SELECT * FROM %s;",
		selector,
	)
	if _, err := qc.ExecuteNonQuery(viewSQL); err != nil {
		return nil, fmt.Errorf("failed to create view: %w", err)
	}

	// fetch schema with nullability
	rows, err := qc.ExecuteQuery(`
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema='main' AND table_name='table_view'
`)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch schema: %w", err)
	}
	defer rows.Close()

	var result []SchemaField
	for rows.Next() {
		var name, typ, nullable string
		if err := rows.Scan(&name, &typ, &nullable); err != nil {
			return nil, fmt.Errorf("failed to scan schema row: %w", err)
		}
		required := strings.EqualFold(nullable, "NO")
		result = append(result, parseField(name, typ, required))
	}
	return result, nil
}
