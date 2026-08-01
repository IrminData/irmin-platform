package engine

import (
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// Test helpers to expose internal functions for testing

// ParseFieldForTesting exposes parseField for testing
func ParseFieldForTesting(name, typ string, required bool) SchemaField {
	return parseField(name, typ, required)
}

// SplitTopLevelCommaForTesting exposes splitTopLevelComma for testing
func SplitTopLevelCommaForTesting(s string) []string {
	return splitTopLevelComma(s)
}

// BuildJSONSchemaForTesting exposes buildJSONSchema for testing
func BuildJSONSchemaForTesting(fields []SchemaField, context *SchemaContext) irminmodels.JSONSchema {
	return buildJSONSchema(fields, context)
}

// PrimitiveSchemaForTesting exposes primitiveSchema for testing
func PrimitiveSchemaForTesting(duckType string, field SchemaField) irminmodels.JSONSchema {
	diag := &schemaDiagnostics{
		unmappedTypes: make(map[string]bool),
	}
	return primitiveSchema(duckType, field, diag)
}

// ExtractArrayElementTypeForTesting exposes extractArrayElementType for testing
func ExtractArrayElementTypeForTesting(arrayType string) string {
	return extractArrayElementType(arrayType)
}

// ParseFieldForElementForTesting exposes parseFieldForElement for testing
func ParseFieldForElementForTesting(name, elementType string, required bool) SchemaField {
	return parseFieldForElement(name, elementType, required)
}

// ParseFieldNameAndTypeForTesting exposes parseFieldNameAndType for testing
func ParseFieldNameAndTypeForTesting(fieldDef string) (string, string) {
	return parseFieldNameAndType(fieldDef)
}
