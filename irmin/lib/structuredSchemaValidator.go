package lib

import (
	"context"
	"database/sql"
	"fmt"
	"irmin-api/duckdb"
	"irmin-api/utils"
	"log/slog"
	"os"
	"path/filepath"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

const (
	decimalPartsWithScale = 2
)

// SchemaField represents one column or nested field in the DuckDB schema.
// This mirrors the engine.SchemaField structure for validation purposes.
type SchemaField struct {
	Name         string        `json:"name"`
	Type         string        `json:"type"`
	Required     bool          `json:"required"`
	Children     []SchemaField `json:"children,omitempty"`
	OriginalType string        `json:"original_type,omitempty"`
}

// ValidateStructuredFileSchema validates a non-JSON structured file against its expected schema.
// It uses DuckDB to read the file, extract its actual schema, and compare it against the expected schema.
func ValidateStructuredFileSchema(
	ctx context.Context,
	fileName string,
	data []byte,
	schema *irminmodels.JSONSchema,
	env *utils.CoreAPIEnv,
	logger *slog.Logger,
) ([]string, []string) {
	var errors []string
	var warnings []string

	// Check if schema is nil or has no properties to validate
	if schema == nil {
		warnings = append(warnings, "No schema provided for validation")
		return errors, warnings
	}

	// Extract the actual schema from the file using DuckDB
	actualFields, extractErr := extractSchemaFromFileData(ctx, fileName, data, env, logger)
	if extractErr != nil {
		errors = append(errors, fmt.Sprintf("Failed to extract schema from file: %v", extractErr))
		return errors, warnings
	}

	// If the schema type is "array", validate the items schema against each field
	if schema.Type == jsonSchemaTypeArray {
		if schema.Items == nil {
			warnings = append(warnings, "Array schema has no items definition to validate against")
			return errors, warnings
		}
		// For array types, validate against the items schema
		fieldErrors, fieldWarnings := validateFieldsAgainstSchema(actualFields, schema.Items)
		errors = append(errors, fieldErrors...)
		warnings = append(warnings, fieldWarnings...)
		return errors, warnings
	}

	// For object types, validate against properties directly
	if schema.Type == jsonSchemaTypeObject {
		fieldErrors, fieldWarnings := validateFieldsAgainstSchema(actualFields, schema)
		errors = append(errors, fieldErrors...)
		warnings = append(warnings, fieldWarnings...)
		return errors, warnings
	}

	warnings = append(warnings, fmt.Sprintf("Unexpected schema type for structured file: %s", schema.Type))
	return errors, warnings
}

// extractSchemaFromFileData uses DuckDB to read a file and extract its schema.
func extractSchemaFromFileData(
	ctx context.Context,
	fileName string,
	data []byte,
	env *utils.CoreAPIEnv,
	logger *slog.Logger,
) ([]SchemaField, error) {
	// Create DuckDB client
	qc, err := duckdb.NewQueryClient(ctx, env, logger)
	if err != nil {
		return nil, fmt.Errorf("failed to create DuckDB client: %w", err)
	}
	defer qc.Close()

	// Create a temporary file to store the data
	tempDir, err := os.MkdirTemp("", "irmin-validate-*")
	if err != nil {
		return nil, fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tempDir)

	// Save the file to the temporary directory
	safeFilename := filepath.Base(fileName)
	tempFilePath := filepath.Join(tempDir, safeFilename)
	if writeErr := os.WriteFile(tempFilePath, data, 0600); writeErr != nil {
		return nil, fmt.Errorf("failed to write temp file: %w", writeErr)
	}

	// Get read options for this file type
	readOptions, readOptsErr := duckdb.GetDuckDBReadOptionsByExtension(filepath.Ext(safeFilename))
	if readOptsErr != nil {
		return nil, fmt.Errorf("unsupported file format: %w", readOptsErr)
	}

	// Install required extensions if any
	requiredExtensions := duckdb.GetRequiredExtensions(readOptions)
	for _, ext := range requiredExtensions {
		installSQL := fmt.Sprintf("INSTALL %s; LOAD %s;", ext, ext)
		if _, installErr := qc.ExecuteNonQuery(ctx, installSQL); installErr != nil {
			logger.WarnContext(ctx, "failed to install extension", "extension", ext, "error", installErr)
		}
	}

	// Build the read query
	readQuery := duckdb.BuildReadQuery(tempFilePath, readOptions)

	// Create a temporary view
	viewSQL := fmt.Sprintf("CREATE OR REPLACE TEMPORARY VIEW validation_view AS SELECT * FROM %s;", readQuery)
	if _, executeErr := qc.ExecuteNonQuery(ctx, viewSQL); executeErr != nil {
		return nil, fmt.Errorf("failed to create view: %w", executeErr)
	}

	// Extract schema using DESCRIBE
	return extractSchemaFromView(ctx, qc, "validation_view")
}

// extractSchemaFromView extracts schema information from a DuckDB view.
func extractSchemaFromView(ctx context.Context, qc *duckdb.QueryClient, viewName string) ([]SchemaField, error) {
	rows, err := qc.ExecuteQuery(ctx, fmt.Sprintf("DESCRIBE %s;", viewName))
	if err != nil {
		return nil, fmt.Errorf("failed to describe view: %w", err)
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
		fieldName := name.String
		if strings.HasPrefix(fieldName, `"`) && strings.HasSuffix(fieldName, `"`) {
			fieldName = fieldName[1 : len(fieldName)-1]
		}

		result = append(result, SchemaField{
			Name:         fieldName,
			Type:         strings.ToUpper(strings.TrimSpace(typ.String)),
			Required:     required,
			OriginalType: typ.String,
		})
	}

	if rows.Err() != nil {
		return nil, fmt.Errorf("error reading schema rows: %w", rows.Err())
	}

	return result, nil
}

// validateFieldsAgainstSchema compares actual fields from the file against the expected JSONSchema.
// Field name matching is case-insensitive to handle DuckDB's case normalization.
func validateFieldsAgainstSchema(actualFields []SchemaField, schema *irminmodels.JSONSchema) ([]string, []string) {
	var errors []string
	var warnings []string

	if schema == nil {
		return errors, warnings
	}

	actualFieldMap := buildActualFieldMap(actualFields)
	schemaPropertyMap := buildSchemaPropertyMap(schema.Properties)

	errors = append(errors, validateRequiredFields(schema.Required, actualFieldMap)...)
	propErrors, propWarnings := validateProperties(schema.Properties, schema.Required, actualFieldMap)
	errors = append(errors, propErrors...)
	warnings = append(warnings, propWarnings...)
	warnings = append(warnings, validateExtraFields(actualFieldMap, schemaPropertyMap)...)

	return errors, warnings
}

// buildActualFieldMap builds a case-insensitive map of actual field names.
func buildActualFieldMap(actualFields []SchemaField) map[string]SchemaField {
	actualFieldMap := make(map[string]SchemaField)
	for _, field := range actualFields {
		actualFieldMap[strings.ToLower(field.Name)] = field
	}
	return actualFieldMap
}

// buildSchemaPropertyMap builds a case-insensitive map of schema property names.
func buildSchemaPropertyMap(properties map[string]irminmodels.JSONSchema) map[string]string {
	schemaPropertyMap := make(map[string]string)
	for propName := range properties {
		schemaPropertyMap[strings.ToLower(propName)] = propName
	}
	return schemaPropertyMap
}

// validateRequiredFields checks if all required fields are present.
func validateRequiredFields(required []string, actualFieldMap map[string]SchemaField) []string {
	var errors []string
	for _, requiredField := range required {
		if _, exists := actualFieldMap[strings.ToLower(requiredField)]; !exists {
			errors = append(errors, fmt.Sprintf("Required field '%s' is missing from file", requiredField))
		}
	}
	return errors
}

// validateProperties validates each expected property against actual fields.
func validateProperties(
	properties map[string]irminmodels.JSONSchema,
	required []string,
	actualFieldMap map[string]SchemaField,
) ([]string, []string) {
	var errors []string
	var warnings []string

	for propName, propSchema := range properties {
		actualField, exists := actualFieldMap[strings.ToLower(propName)]
		if !exists {
			if isFieldRequired(propName, required) {
				// Already reported in validateRequiredFields
				continue
			}
			warnings = append(warnings, fmt.Sprintf("Expected field '%s' not found in file", propName))
			continue
		}

		// Validate type compatibility
		typeErr := validateTypeCompatibility(propName, actualField.Type, propSchema)
		if typeErr != "" {
			errors = append(errors, typeErr)
		}
	}

	return errors, warnings
}

// isFieldRequired checks if a field is in the required list (case-insensitive).
func isFieldRequired(fieldName string, required []string) bool {
	for _, req := range required {
		if strings.EqualFold(req, fieldName) {
			return true
		}
	}
	return false
}

// validateExtraFields checks for extra fields in the file that are not in the schema.
func validateExtraFields(actualFieldMap map[string]SchemaField, schemaPropertyMap map[string]string) []string {
	var warnings []string
	for fieldName := range actualFieldMap {
		if _, exists := schemaPropertyMap[strings.ToLower(fieldName)]; !exists {
			actualField := actualFieldMap[fieldName]
			warnings = append(
				warnings,
				fmt.Sprintf("File contains unexpected field '%s' not defined in schema", actualField.Name),
			)
		}
	}
	return warnings
}

// validateTypeCompatibility checks if a DuckDB type is compatible with a JSONSchema type.
func validateTypeCompatibility(fieldName, duckDBType string, propSchema irminmodels.JSONSchema) string {
	// Normalize the DuckDB type
	normalizedType := strings.ToUpper(strings.TrimSpace(duckDBType))

	// Map DuckDB types to JSON schema types
	expectedJSONType := propSchema.Type

	switch expectedJSONType {
	case "string":
		if isStringCompatible(normalizedType) {
			return ""
		}
		return fmt.Sprintf("Field '%s' has type '%s' but schema expects 'string'", fieldName, duckDBType)

	case "integer":
		if isIntegerCompatible(normalizedType) {
			return ""
		}
		return fmt.Sprintf("Field '%s' has type '%s' but schema expects 'integer'", fieldName, duckDBType)

	case "number":
		if isNumberCompatible(normalizedType) {
			return ""
		}
		return fmt.Sprintf("Field '%s' has type '%s' but schema expects 'number'", fieldName, duckDBType)

	case "boolean":
		if normalizedType == "BOOLEAN" || normalizedType == "BOOL" {
			return ""
		}
		return fmt.Sprintf("Field '%s' has type '%s' but schema expects 'boolean'", fieldName, duckDBType)

	case jsonSchemaTypeArray:
		// DuckDB represents arrays as: TYPE[], TYPE[SIZE] (fixed-size), or LIST(TYPE)
		if strings.HasPrefix(normalizedType, "ARRAY<") ||
			strings.HasSuffix(normalizedType, "[]") ||
			isFixedSizeArray(normalizedType) ||
			strings.HasPrefix(normalizedType, "LIST(") {
			return ""
		}
		return fmt.Sprintf("Field '%s' has type '%s' but schema expects 'array'", fieldName, duckDBType)

	case jsonSchemaTypeObject:
		// DuckDB represents maps as: MAP(KEY_TYPE, VALUE_TYPE)
		if strings.HasPrefix(normalizedType, "STRUCT(") ||
			strings.HasPrefix(normalizedType, "MAP(") ||
			normalizedType == "JSON" {
			return ""
		}
		return fmt.Sprintf("Field '%s' has type '%s' but schema expects 'object'", fieldName, duckDBType)

	case "null":
		// Any type can potentially be null in DuckDB
		return ""

	default:
		// Unknown schema type - warn but don't error
		return ""
	}
}

// isStringCompatible checks if a DuckDB type can be represented as a JSON string.
func isStringCompatible(duckDBType string) bool {
	stringTypes := map[string]bool{
		"VARCHAR":                  true,
		"TEXT":                     true,
		"CHAR":                     true,
		"BPCHAR":                   true,
		"DATE":                     true,
		"TIME":                     true,
		"TIMESTAMP":                true,
		"TIMESTAMPTZ":              true,
		"TIMESTAMP WITH TIME ZONE": true,
		"INTERVAL":                 true,
		"UUID":                     true,
		"INET":                     true,
		"IPV4":                     true,
		"IPV6":                     true,
		"BLOB":                     true,
		"BINARY":                   true,
		"VARBINARY":                true,
		"BYTEA":                    true,
	}
	return stringTypes[duckDBType] || strings.HasPrefix(duckDBType, "VARCHAR(")
}

// isIntegerCompatible checks if a DuckDB type can be represented as a JSON integer.
func isIntegerCompatible(duckDBType string) bool {
	intTypes := map[string]bool{
		"TINYINT":   true,
		"SMALLINT":  true,
		"INTEGER":   true,
		"INT":       true,
		"BIGINT":    true,
		"UTINYINT":  true,
		"USMALLINT": true,
		"UINTEGER":  true,
		"UINT":      true,
		"UBIGINT":   true,
		"HUGEINT":   true,
	}
	// DECIMAL with scale 0 is also an integer (e.g., DECIMAL(10,0) or DECIMAL(10))
	if strings.HasPrefix(duckDBType, "DECIMAL") {
		return isDecimalIntegerCompatible(duckDBType)
	}
	return intTypes[duckDBType]
}

// isDecimalIntegerCompatible checks if a DECIMAL type has scale 0 (no fractional digits).
// Accepts: DECIMAL, DECIMAL(p), DECIMAL(p,0) where scale is 0.
// Rejects: DECIMAL(p,s) where s > 0.
func isDecimalIntegerCompatible(duckDBType string) bool {
	// Bare "DECIMAL" without parameters - depends on DB defaults, but typically scale 0
	if duckDBType == "DECIMAL" {
		return true
	}

	// Extract parameters from DECIMAL(precision,scale) or DECIMAL(precision)
	if !strings.HasPrefix(duckDBType, "DECIMAL(") || !strings.HasSuffix(duckDBType, ")") {
		return false
	}

	// Get the content inside parentheses
	inner := duckDBType[8 : len(duckDBType)-1] // "DECIMAL(" is 8 chars

	parts := strings.Split(inner, ",")
	switch len(parts) {
	case 1:
		// DECIMAL(precision) - scale defaults to 0
		return true
	case decimalPartsWithScale:
		// DECIMAL(precision,scale) - check if scale is 0
		scale := strings.TrimSpace(parts[1])
		return scale == "0"
	default:
		return false
	}
}

// isFixedSizeArray checks if a DuckDB type is a fixed-size array (e.g., INTEGER[3]).
// DuckDB represents fixed-size arrays as TYPE[SIZE] where SIZE is a positive integer.
func isFixedSizeArray(duckDBType string) bool {
	// Look for pattern TYPE[N] where N is a number
	openBracket := strings.LastIndex(duckDBType, "[")
	if openBracket == -1 {
		return false
	}
	if !strings.HasSuffix(duckDBType, "]") {
		return false
	}
	// Extract the size specification between [ and ]
	sizeSpec := duckDBType[openBracket+1 : len(duckDBType)-1]
	// Empty brackets are handled by the [] suffix check, so this handles [N] cases
	if sizeSpec == "" {
		return false
	}
	// Verify it's a valid number
	for _, c := range sizeSpec {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

// isNumberCompatible checks if a DuckDB type can be represented as a JSON number.
func isNumberCompatible(duckDBType string) bool {
	// All integer types are also numbers
	if isIntegerCompatible(duckDBType) {
		return true
	}

	numTypes := map[string]bool{
		"FLOAT":   true,
		"DOUBLE":  true,
		"REAL":    true,
		"DECIMAL": true,
		"NUMERIC": true,
	}

	// Handle parameterized types like DECIMAL(10,2)
	if strings.HasPrefix(duckDBType, "DECIMAL(") || strings.HasPrefix(duckDBType, "NUMERIC(") {
		return true
	}

	return numTypes[duckDBType]
}
