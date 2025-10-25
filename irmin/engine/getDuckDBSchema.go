package engine

import (
	"context"
	"database/sql"
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
// OriginalType preserves the exact DuckDB type string for traceability.
// Precision and Scale are for DECIMAL types.
type SchemaField struct {
	Name         string        `json:"name"`
	Type         string        `json:"type"`
	Required     bool          `json:"required"`
	Children     []SchemaField `json:"children,omitempty"`
	OriginalType string        `json:"original_type,omitempty"`
	Precision    *int          `json:"precision,omitempty"`
	Scale        *int          `json:"scale,omitempty"`
}

// minFieldParts is the minimum number of parts required for a valid field definition
// (name and type).
const minFieldParts = 2

// typeInfo holds parsed type information including metadata
type typeInfo struct {
	normalizedType string
	originalType   string
	precision      *int
	scale          *int
}

// parseDecimalParameters extracts precision and scale from DECIMAL/NUMERIC type strings
func parseDecimalParameters(typeStr string) (*int, *int) {
	start := strings.Index(typeStr, "(")
	end := strings.Index(typeStr, ")")
	if start == -1 || end == -1 || end <= start {
		return nil, nil
	}

	params := strings.Split(typeStr[start+1:end], ",")
	var precision, scale *int

	// Parse precision (first parameter)
	if len(params) >= 1 {
		if p, err := parseInt(strings.TrimSpace(params[0])); err == nil {
			precision = &p
		}
	}

	// Parse scale (second parameter)
	const scaleParamIndex = 1
	const minDecimalParams = 2
	if len(params) >= minDecimalParams {
		if s, err := parseInt(strings.TrimSpace(params[scaleParamIndex])); err == nil {
			scale = &s
		}
	}

	return precision, scale
}

// normalizeAndParseType takes a raw DuckDB type string and extracts normalized type
// plus any metadata (precision, scale for DECIMAL, etc.)
func normalizeAndParseType(rawType string) typeInfo {
	info := typeInfo{
		originalType:   rawType,
		normalizedType: strings.ToUpper(strings.TrimSpace(rawType)),
	}

	// Handle DECIMAL/NUMERIC with precision and scale: DECIMAL(10,2)
	if strings.HasPrefix(info.normalizedType, "DECIMAL(") || strings.HasPrefix(info.normalizedType, "NUMERIC(") {
		info.precision, info.scale = parseDecimalParameters(info.normalizedType)
		// Normalize to just DECIMAL (both NUMERIC and DECIMAL become DECIMAL)
		info.normalizedType = "DECIMAL"
		return info
	}

	// Handle array syntax variations: INTEGER[] → ARRAY<INTEGER>
	if strings.HasSuffix(info.normalizedType, "[]") && !strings.HasPrefix(info.normalizedType, "ARRAY<") {
		baseType := strings.TrimSuffix(info.normalizedType, "[]")
		info.normalizedType = "ARRAY<" + baseType + ">"
		return info
	}

	return info
}

// parseInt parses an integer from a string
func parseInt(s string) (int, error) {
	var result int
	_, err := fmt.Sscanf(s, "%d", &result)
	return result, err
}

// splitTopLevelComma splits a STRUCT(...) definition by commas at top-level only,
// ignoring commas inside nested parentheses and respecting quoted identifiers.
func splitTopLevelComma(s string) []string {
	var parts []string
	var buf strings.Builder
	depth := 0
	inQuotes := false
	escapeNext := false

	for _, r := range s {
		if escapeNext {
			buf.WriteRune(r)
			escapeNext = false
			continue
		}

		switch r {
		case '\\':
			escapeNext = true
			buf.WriteRune(r)
		case '"':
			inQuotes = !inQuotes
			buf.WriteRune(r)
		case '(':
			if !inQuotes {
				depth++
			}
			buf.WriteRune(r)
		case ')':
			if !inQuotes {
				depth--
			}
			buf.WriteRune(r)
		case ',':
			if depth == 0 && !inQuotes {
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

// parseStructFields parses struct field definitions and returns children
func parseStructFields(structDef string, required bool) []SchemaField {
	fields := splitTopLevelComma(structDef)
	children := make([]SchemaField, 0, len(fields))
	for _, f := range fields {
		childName, childType := parseFieldNameAndType(strings.TrimSpace(f))
		if childName == "" || childType == "" {
			continue
		}

		// Remove surrounding quotes from field names if present
		// DuckDB STRUCT definitions include quotes for identifiers with spaces
		if strings.HasPrefix(childName, `"`) && strings.HasSuffix(childName, `"`) {
			childName = childName[1 : len(childName)-1]
		}

		children = append(children, parseField(childName, childType, required))
	}
	return children
}

// parseFieldNameAndType splits a field definition into name and type,
// respecting quoted identifiers (e.g., "CPU model" VARCHAR -> name: "CPU model", type: VARCHAR)
func parseFieldNameAndType(fieldDef string) (string, string) {
	if fieldDef == "" {
		return "", ""
	}

	// Check if field name is quoted
	if strings.HasPrefix(fieldDef, `"`) {
		// Find the closing quote
		closeQuoteIdx := strings.Index(fieldDef[1:], `"`)
		if closeQuoteIdx == -1 {
			// Malformed quoted identifier, fall back to simple split
			parts := strings.Fields(fieldDef)
			if len(parts) < minFieldParts {
				return "", ""
			}
			return parts[0], strings.Join(parts[1:], " ")
		}

		// Extract the quoted name (including quotes) and the type
		name := fieldDef[:closeQuoteIdx+2] // +2 to include both quotes
		typ := strings.TrimSpace(fieldDef[closeQuoteIdx+2:])
		return name, typ
	}

	// Unquoted identifier - split on first space
	parts := strings.Fields(fieldDef)
	if len(parts) < minFieldParts {
		return "", ""
	}
	return parts[0], strings.Join(parts[1:], " ")
}

// handleArrayOfStructs processes array of struct types
func handleArrayOfStructs(name, normalizedType string, tInfo typeInfo, required bool) SchemaField {
	var nested string
	if strings.HasSuffix(normalizedType, ")[]") {
		// STRUCT(...)[]
		nested = normalizedType[len("STRUCT(") : len(normalizedType)-3]
	} else {
		// ARRAY<STRUCT(...)>
		nested = normalizedType[len("ARRAY<STRUCT(") : len(normalizedType)-2]
	}

	children := parseStructFields(nested, required)
	return SchemaField{
		Name:         name,
		Type:         "ARRAY<STRUCT>",
		Required:     required,
		Children:     children,
		OriginalType: tInfo.originalType,
	}
}

// handleStruct processes regular struct types
func handleStruct(name, normalizedType string, tInfo typeInfo, required bool) SchemaField {
	nested := normalizedType[len("STRUCT(") : len(normalizedType)-1]
	children := parseStructFields(nested, required)
	return SchemaField{
		Name:         name,
		Type:         "STRUCT",
		Required:     required,
		Children:     children,
		OriginalType: tInfo.originalType,
	}
}

// parseField constructs a SchemaField recursively from its name, type and required flag.
func parseField(name, typ string, required bool) SchemaField {
	// Normalize and parse the type to extract metadata
	tInfo := normalizeAndParseType(typ)
	normalizedType := tInfo.normalizedType

	// Handle array of structs: STRUCT(...)[] or ARRAY<STRUCT(...)>
	if (strings.HasPrefix(normalizedType, "STRUCT(") && strings.HasSuffix(normalizedType, ")[]")) ||
		(strings.HasPrefix(normalizedType, "ARRAY<STRUCT(") && strings.HasSuffix(normalizedType, ")>")) {
		return handleArrayOfStructs(name, normalizedType, tInfo, required)
	}

	// Handle regular struct
	if strings.HasPrefix(normalizedType, "STRUCT(") && strings.HasSuffix(normalizedType, ")") {
		return handleStruct(name, normalizedType, tInfo, required)
	}

	// Handle ARRAY<primitive> types
	if strings.HasPrefix(normalizedType, "ARRAY<") && strings.HasSuffix(normalizedType, ">") {
		return SchemaField{
			Name:         name,
			Type:         normalizedType,
			Required:     required,
			OriginalType: tInfo.originalType,
		}
	}

	// Handle MAP<K,V> types
	if strings.HasPrefix(normalizedType, "MAP<") && strings.HasSuffix(normalizedType, ">") {
		return SchemaField{
			Name:         name,
			Type:         normalizedType,
			Required:     required,
			OriginalType: tInfo.originalType,
		}
	}

	// Primitive or other types
	return SchemaField{
		Name:         name,
		Type:         normalizedType,
		Required:     required,
		OriginalType: tInfo.originalType,
		Precision:    tInfo.precision,
		Scale:        tInfo.scale,
	}
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
	// Use DESCRIBE instead of information_schema to preserve original field name casing
	// information_schema.columns uppercases column names, but DESCRIBE preserves them
	rows, executeQueryErr := qc.ExecuteQuery(ctx, "DESCRIBE table_view;")
	if executeQueryErr != nil {
		return nil, fmt.Errorf("failed to fetch schema: %w", executeQueryErr)
	}
	if rows.Err() != nil {
		return nil, fmt.Errorf("failed to fetch schema: %w", rows.Err())
	}
	defer rows.Close()

	var result []SchemaField
	for rows.Next() {
		// DESCRIBE returns: column_name, column_type, null, key, default, extra
		var name, typ, null, key, defaultValue, extra sql.NullString
		if scanErr := rows.Scan(&name, &typ, &null, &key, &defaultValue, &extra); scanErr != nil {
			return nil, fmt.Errorf("failed to scan schema row: %w", scanErr)
		}

		if !name.Valid || !typ.Valid {
			continue
		}

		// In DuckDB DESCRIBE output, null column is "YES" or "NO"
		required := false
		if null.Valid && strings.EqualFold(null.String, "NO") {
			required = true
		}

		// Remove surrounding quotes from field names if present
		// DuckDB's DESCRIBE includes quotes for identifiers with spaces
		fieldName := name.String
		if strings.HasPrefix(fieldName, `"`) && strings.HasSuffix(fieldName, `"`) {
			fieldName = fieldName[1 : len(fieldName)-1]
		}

		result = append(result, parseField(fieldName, typ.String, required))
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

	// Get read options from the centralized duckdb package
	readOptions, readOptsErr := duckdb.GetDuckDBReadOptionsByExtension(filepath.Ext(safeFilename))
	if readOptsErr != nil {
		return nil, fmt.Errorf("unsupported file format: %w", readOptsErr)
	}

	// Install required extensions if any
	requiredExtensions := duckdb.GetRequiredExtensions(readOptions)
	for _, ext := range requiredExtensions {
		installSQL := fmt.Sprintf("INSTALL %s; LOAD %s;", ext, ext)
		if _, installErr := qc.ExecuteNonQuery(ctx, installSQL); installErr != nil {
			c.Logger.WarnContext(ctx, "failed to install extension", "extension", ext, "error", installErr)
		}
	}

	// Build the read query using the centralized function
	readQuery := duckdb.BuildReadQuery(tempFilePath, readOptions)

	// Create the view
	viewSQL := fmt.Sprintf("CREATE OR REPLACE TEMPORARY VIEW table_view AS SELECT * FROM %s;", readQuery)
	if _, executeNonQueryErr := qc.ExecuteNonQuery(ctx, viewSQL); executeNonQueryErr != nil {
		return nil, fmt.Errorf("failed to create view: %w", executeNonQueryErr)
	}

	// Use the shared schema extraction logic
	return extractSchemaFromView(ctx, qc)
}
