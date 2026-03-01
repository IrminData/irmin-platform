package engine

import (
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// schemaVersion is the current version of the schema generation logic
const schemaVersion = "1.1.0"

// SchemaContext holds optional context information for schema generation
type SchemaContext struct {
	Repository string
	Path       string
	Ref        string
}

// schemaDiagnostics tracks unmapped types and conversion issues
type schemaDiagnostics struct {
	unmappedTypes map[string]bool
}

// buildJSONSchema converts a flat slice of SchemaField into a JSONSchema
// representing an object whose properties match the fields.
//
//   - fields: the result of getDuckDBSchema(...)
//   - context: optional metadata for traceability (repository, path, ref)
//     ↪︎ returns: a JSONSchema with Type="object", Properties and Required
func buildJSONSchema(fields []SchemaField, context *SchemaContext) irminmodels.JSONSchema {
	js := irminmodels.JSONSchema{
		Type:       "object",
		Properties: map[string]irminmodels.JSONSchema{},
		Required:   []string{},
	}

	// Initialize diagnostics to track unmapped types
	diag := &schemaDiagnostics{
		unmappedTypes: make(map[string]bool),
	}

	for _, f := range fields {
		js.Properties[f.Name] = schemaForField(f, diag)
		if f.Required {
			js.Required = append(js.Required, f.Name)
		}
	}

	// Add traceability metadata if context is provided
	if context != nil && (context.Repository != "" || context.Path != "" || context.Ref != "") {
		irminMeta := make(map[string]string)
		if context.Repository != "" {
			irminMeta["repository"] = context.Repository
		}
		if context.Path != "" {
			irminMeta["path"] = context.Path
		}
		if context.Ref != "" {
			irminMeta["ref"] = context.Ref
		}
		js.XIrmin = &irminMeta
	}

	// Add schema version and inference metadata
	version := schemaVersion
	inferredBy := "duckdb-information_schema"
	js.XIrminSchemaVersion = &version
	js.XInferredBy = &inferredBy

	// Add unmapped types diagnostics if any were found
	if len(diag.unmappedTypes) > 0 {
		unmapped := make([]string, 0, len(diag.unmappedTypes))
		for t := range diag.unmappedTypes {
			unmapped = append(unmapped, t)
		}
		js.XUnmappedTypes = &unmapped
	}

	return js
}

// handleArrayType processes ARRAY types and returns the appropriate JSONSchema
func handleArrayType(f SchemaField, diag *schemaDiagnostics) irminmodels.JSONSchema {
	var items irminmodels.JSONSchema
	// for array of structs, recurse into children
	if len(f.Children) > 0 {
		items = schemaForField(SchemaField{
			Name:     f.Name,
			Type:     "STRUCT",
			Children: f.Children,
			Required: true, // array items always present if field itself is required
		}, diag)
	} else {
		// Extract the array element type: ARRAY<INTEGER> -> INTEGER
		elementType := extractArrayElementType(f.Type)
		// Parse the element type to get normalized type and metadata
		elementField := parseFieldForElement(f.Name+"_element", elementType, true)
		items = primitiveSchema(elementField.Type, elementField, diag)
	}
	schema := irminmodels.JSONSchema{
		Type:  "array",
		Items: &items,
	}
	// Don't automatically set minItems - use Required in parent object instead
	if f.OriginalType != "" {
		schema.XOriginalDuckDBType = &f.OriginalType
	}
	return schema
}

// handleStructType processes STRUCT types and returns the appropriate JSONSchema
func handleStructType(f SchemaField, diag *schemaDiagnostics) irminmodels.JSONSchema {
	props := make(map[string]irminmodels.JSONSchema, len(f.Children))
	req := []string{}
	for _, child := range f.Children {
		props[child.Name] = schemaForField(child, diag)
		if child.Required {
			req = append(req, child.Name)
		}
	}
	schema := irminmodels.JSONSchema{
		Type:       "object",
		Properties: props,
	}
	if len(req) > 0 {
		schema.Required = req
	}
	if f.OriginalType != "" {
		schema.XOriginalDuckDBType = &f.OriginalType
	}
	return schema
}

// handleMapType processes MAP types and returns the appropriate JSONSchema
func handleMapType(f SchemaField, diag *schemaDiagnostics) irminmodels.JSONSchema {
	// Extract value type from MAP<K,V>
	inner := strings.TrimSuffix(strings.TrimPrefix(f.Type, "MAP<"), ">")
	parts := splitMapTypes(inner)
	var valueSchema irminmodels.JSONSchema
	const minMapParts = 2
	if len(parts) >= minMapParts {
		// Parse the value type to get normalized type and metadata
		valueField := parseFieldForElement(f.Name+"_value", parts[1], true)
		valueSchema = primitiveSchema(valueField.Type, valueField, diag)
	} else {
		valueSchema = irminmodels.JSONSchema{Type: "string"}
	}
	schema := irminmodels.JSONSchema{
		Type:                 "object",
		AdditionalProperties: valueSchema,
	}
	if f.OriginalType != "" {
		schema.XOriginalDuckDBType = &f.OriginalType
	}
	return schema
}

// schemaForField builds a JSONSchema for a single SchemaField, handling
// recursion into nested STRUCTs and arrays, and carrying through Required.
func schemaForField(f SchemaField, diag *schemaDiagnostics) irminmodels.JSONSchema {
	// 1) ARRAY types
	if strings.HasPrefix(f.Type, "ARRAY<") {
		return handleArrayType(f, diag)
	}

	// 2) STRUCT → object
	if f.Type == "STRUCT" {
		return handleStructType(f, diag)
	}

	// 3) MAP types → object with additionalProperties
	if strings.HasPrefix(f.Type, "MAP<") {
		return handleMapType(f, diag)
	}

	// 4) primitive or JSON
	return primitiveSchema(f.Type, f, diag)
}

// extractArrayElementType extracts the element type from an array type string.
// Handles both ARRAY<TYPE> and TYPE[] syntax, with proper validation.
func extractArrayElementType(arrayType string) string {
	normalized := strings.ToUpper(strings.TrimSpace(arrayType))

	// Handle ARRAY<TYPE> syntax
	if strings.HasPrefix(normalized, "ARRAY<") && strings.HasSuffix(normalized, ">") {
		elementType := normalized[6 : len(normalized)-1] // Remove "ARRAY<" and ">"
		return strings.TrimSpace(elementType)
	}

	// Handle TYPE[] syntax
	if strings.HasSuffix(normalized, "[]") {
		elementType := normalized[:len(normalized)-2] // Remove "[]"
		return strings.TrimSpace(elementType)
	}

	// If it doesn't match expected array patterns, return as-is
	// This handles edge cases where the type might be malformed
	return normalized
}

// parseFieldForElement creates a SchemaField for an array element or map value type.
// This ensures parameterized types like DECIMAL(10,2) are properly normalized.
func parseFieldForElement(name, elementType string, required bool) SchemaField {
	// Use the same normalization logic as parseField but for primitive types only
	tInfo := normalizeAndParseType(elementType)

	return SchemaField{
		Name:         name,
		Type:         tInfo.normalizedType,
		Required:     required,
		OriginalType: tInfo.originalType,
		Precision:    tInfo.precision,
		Scale:        tInfo.scale,
	}
}

// splitMapTypes splits MAP<K,V> inner types by comma, accounting for nested types
func splitMapTypes(s string) []string {
	var parts []string
	var buf strings.Builder
	depth := 0
	for _, r := range s {
		switch r {
		case '<', '(':
			depth++
			buf.WriteRune(r)
		case '>', ')':
			depth--
			buf.WriteRune(r)
		case ',':
			if depth == 0 {
				parts = append(parts, strings.TrimSpace(buf.String()))
				buf.Reset()
			} else {
				buf.WriteRune(r)
			}
		default:
			buf.WriteRune(r)
		}
	}
	if buf.Len() > 0 {
		parts = append(parts, strings.TrimSpace(buf.String()))
	}
	return parts
}

// ptrString is a small helper to get a *string
func ptrString(v string) *string { return &v }

// createBasicSchema creates a basic JSONSchema with optional metadata
func createBasicSchema(jsonType string, field SchemaField) irminmodels.JSONSchema {
	schema := irminmodels.JSONSchema{Type: jsonType}
	if field.OriginalType != "" {
		schema.XOriginalDuckDBType = &field.OriginalType
	}
	return schema
}

// createStringSchema creates a string JSONSchema with format
func createStringSchema(format string, field SchemaField) irminmodels.JSONSchema {
	schema := irminmodels.JSONSchema{Type: "string", Format: ptrString(format)}
	if field.OriginalType != "" {
		schema.XOriginalDuckDBType = &field.OriginalType
	}
	return schema
}

// createDecimalSchema creates a decimal JSONSchema with precision/scale
func createDecimalSchema(field SchemaField) irminmodels.JSONSchema {
	// If scale is 0, treat as integer
	if field.Scale != nil && *field.Scale == 0 {
		schema := irminmodels.JSONSchema{Type: "integer"}
		if field.OriginalType != "" {
			schema.XOriginalDuckDBType = &field.OriginalType
		}
		if field.Precision != nil {
			schema.XDecimalPrecision = field.Precision
		}
		if field.Scale != nil {
			schema.XDecimalScale = field.Scale
		}
		return schema
	}

	schema := irminmodels.JSONSchema{Type: "number"}
	if field.OriginalType != "" {
		schema.XOriginalDuckDBType = &field.OriginalType
	}
	if field.Precision != nil {
		schema.XDecimalPrecision = field.Precision
	}
	if field.Scale != nil {
		schema.XDecimalScale = field.Scale
		// Note: multipleOf can be added for small scales (≤ 6) but may be too
		// restrictive due to floating-point representation. Omitting for now.
	}
	return schema
}

// createBinarySchema creates a binary JSONSchema with base64 encoding
func createBinarySchema(field SchemaField) irminmodels.JSONSchema {
	schema := irminmodels.JSONSchema{
		Type:             "string",
		ContentEncoding:  ptrString("base64"),
		ContentMediaType: ptrString("application/octet-stream"),
	}
	if field.OriginalType != "" {
		schema.XOriginalDuckDBType = &field.OriginalType
	}
	return schema
}

// createIntervalSchema creates an interval JSONSchema with special metadata
func createIntervalSchema(field SchemaField) irminmodels.JSONSchema {
	schema := irminmodels.JSONSchema{Type: "string"}
	intervalType := "INTERVAL"
	schema.XDuckDBType = &intervalType
	if field.OriginalType != "" {
		schema.XOriginalDuckDBType = &field.OriginalType
	}
	return schema
}

// primitiveSchema maps a DuckDB type into a JSONSchema for a primitive.
// It takes the field to access metadata like precision/scale and diagnostics to track unmapped types.
func primitiveSchema(duckType string, field SchemaField, diag *schemaDiagnostics) irminmodels.JSONSchema {
	dt := strings.ToUpper(duckType)

	// Track known DuckDB types
	knownTypes := map[string]bool{
		"VARCHAR": true, "TEXT": true, "BOOLEAN": true,
		"TINYINT": true, "SMALLINT": true, "INTEGER": true, "BIGINT": true,
		"UTINYINT": true, "USMALLINT": true, "UINTEGER": true, "UBIGINT": true, "HUGEINT": true,
		"FLOAT": true, "DOUBLE": true, "REAL": true, duckDBTypeDecimal: true,
		"TIMESTAMP": true, "TIMESTAMP_LTZ": true, "TIMESTAMP_NTZ": true, "DATETIME": true,
		"TIMESTAMPTZ": true, "TIMESTAMP WITH TIME ZONE": true,
		"DATE": true, "TIME": true, "TIME WITH TIME ZONE": true, "TIMETZ": true,
		"INTERVAL": true, "UUID": true, "INET": true, "IPV4": true, "IPV6": true,
		"BLOB": true, "BINARY": true, "VARBINARY": true, "BYTEA": true, "JSON": true,
	}

	if !knownTypes[dt] {
		// Track unmapped types
		if diag != nil {
			diag.unmappedTypes[dt] = true
		}
	}

	// Handle string types
	if dt == "VARCHAR" || dt == "TEXT" {
		return createBasicSchema("string", field)
	}

	// Handle boolean types
	if dt == "BOOLEAN" {
		return createBasicSchema("boolean", field)
	}

	// Handle integer types
	integerTypes := map[string]bool{
		"TINYINT": true, "SMALLINT": true, "INTEGER": true, "BIGINT": true,
		"UTINYINT": true, "USMALLINT": true, "UINTEGER": true, "UBIGINT": true, "HUGEINT": true,
	}
	if integerTypes[dt] {
		return createBasicSchema("integer", field)
	}

	// Handle float types
	if dt == "FLOAT" || dt == "DOUBLE" || dt == "REAL" {
		return createBasicSchema("number", field)
	}

	// Handle decimal types
	if dt == duckDBTypeDecimal {
		return createDecimalSchema(field)
	}

	// Handle timestamp types
	timestampTypes := map[string]bool{
		"TIMESTAMP": true, "TIMESTAMP_LTZ": true, "TIMESTAMP_NTZ": true, "DATETIME": true,
		"TIMESTAMPTZ": true, "TIMESTAMP WITH TIME ZONE": true,
	}
	if timestampTypes[dt] {
		return createStringSchema("date-time", field)
	}

	// Handle date types
	if dt == "DATE" {
		return createStringSchema("date", field)
	}

	// Handle time types
	timeTypes := map[string]bool{
		"TIME": true, "TIME WITH TIME ZONE": true, "TIMETZ": true,
	}
	if timeTypes[dt] {
		return createStringSchema("time", field)
	}

	// Handle interval types
	if dt == "INTERVAL" {
		return createIntervalSchema(field)
	}

	// Handle UUID types
	if dt == "UUID" {
		return createStringSchema("uuid", field)
	}

	// Handle IP types
	ipTypes := map[string]bool{
		"INET": true, "IPV4": true, "IPV6": true,
	}
	if ipTypes[dt] {
		return createStringSchema("ip", field)
	}

	// Handle binary types
	binaryTypes := map[string]bool{
		"BLOB": true, "BINARY": true, "VARBINARY": true, "BYTEA": true,
	}
	if binaryTypes[dt] {
		return createBinarySchema(field)
	}

	// Handle JSON types
	if dt == "JSON" {
		schema := irminmodels.JSONSchema{
			Type:                 "object",
			AdditionalProperties: true,
		}
		if field.OriginalType != "" {
			schema.XOriginalDuckDBType = &field.OriginalType
		}
		return schema
	}

	// Unknown type - default to string with metadata
	return createBasicSchema("string", field)
}
