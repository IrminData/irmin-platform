package engine_test

import (
	"irmin-api/engine"
	"testing"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/zeebo/assert"
)

func TestNormalizeAndParseType_Decimal(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		expectedType  string
		expectedPrec  *int
		expectedScale *int
	}{
		{
			name:          "DECIMAL with precision and scale",
			input:         "DECIMAL(10,2)",
			expectedType:  "DECIMAL",
			expectedPrec:  intPtr(10),
			expectedScale: intPtr(2),
		},
		{
			name:          "NUMERIC with precision and scale",
			input:         "NUMERIC(18,4)",
			expectedType:  "DECIMAL",
			expectedPrec:  intPtr(18),
			expectedScale: intPtr(4),
		},
		{
			name:          "DECIMAL with only precision",
			input:         "DECIMAL(10)",
			expectedType:  "DECIMAL",
			expectedPrec:  intPtr(10),
			expectedScale: nil,
		},
		{
			name:          "DECIMAL(10,0) - zero scale",
			input:         "DECIMAL(10,0)",
			expectedType:  "DECIMAL",
			expectedPrec:  intPtr(10),
			expectedScale: intPtr(0),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			field := engine.ParseFieldForTesting("test", tt.input, false)

			assert.Equal(t, tt.expectedType, field.Type)

			if tt.expectedPrec != nil {
				assert.NotNil(t, field.Precision)
				assert.Equal(t, *tt.expectedPrec, *field.Precision)
			} else {
				assert.Nil(t, field.Precision)
			}

			if tt.expectedScale != nil {
				assert.NotNil(t, field.Scale)
				assert.Equal(t, *tt.expectedScale, *field.Scale)
			} else {
				assert.Nil(t, field.Scale)
			}
		})
	}
}

func TestNormalizeAndParseType_Arrays(t *testing.T) {
	tests := []struct {
		name         string
		input        string
		expectedType string
	}{
		{
			name:         "Old array syntax INTEGER[]",
			input:        "INTEGER[]",
			expectedType: "ARRAY<INTEGER>",
		},
		{
			name:         "New array syntax ARRAY<INTEGER>",
			input:        "ARRAY<INTEGER>",
			expectedType: "ARRAY<INTEGER>",
		},
		{
			name:         "VARCHAR array old syntax",
			input:        "VARCHAR[]",
			expectedType: "ARRAY<VARCHAR>",
		},
		{
			name:         "VARCHAR array new syntax",
			input:        "ARRAY<VARCHAR>",
			expectedType: "ARRAY<VARCHAR>",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			field := engine.ParseFieldForTesting("test", tt.input, false)
			assert.Equal(t, tt.expectedType, field.Type)
		})
	}
}

func TestParseField_Struct(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		expectedType  string
		childrenCount int
	}{
		{
			name:          "Simple struct",
			input:         "STRUCT(a INTEGER, b VARCHAR)",
			expectedType:  "STRUCT",
			childrenCount: 2,
		},
		{
			name:          "Array of struct - old syntax",
			input:         "STRUCT(x INTEGER, y INTEGER)[]",
			expectedType:  "ARRAY<STRUCT>",
			childrenCount: 2,
		},
		{
			name:          "Array of struct - new syntax",
			input:         "ARRAY<STRUCT(x INTEGER, y INTEGER)>",
			expectedType:  "ARRAY<STRUCT>",
			childrenCount: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			field := engine.ParseFieldForTesting("test", tt.input, false)
			assert.Equal(t, tt.expectedType, field.Type)
			assert.Equal(t, tt.childrenCount, len(field.Children))
		})
	}
}

func TestParseField_Map(t *testing.T) {
	tests := []struct {
		name         string
		input        string
		expectedType string
	}{
		{
			name:         "MAP with string keys and integer values",
			input:        "MAP<VARCHAR,INTEGER>",
			expectedType: "MAP<VARCHAR,INTEGER>",
		},
		{
			name:         "MAP with integer keys and varchar values",
			input:        "MAP<INTEGER,VARCHAR>",
			expectedType: "MAP<INTEGER,VARCHAR>",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			field := engine.ParseFieldForTesting("test", tt.input, false)
			assert.Equal(t, tt.expectedType, field.Type)
		})
	}
}

func TestSplitTopLevelComma(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected []string
	}{
		{
			name:     "Simple fields",
			input:    "a INTEGER, b VARCHAR",
			expected: []string{"a INTEGER", " b VARCHAR"},
		},
		{
			name:     "Nested struct",
			input:    "a STRUCT(x INT, y INT), b VARCHAR",
			expected: []string{"a STRUCT(x INT, y INT)", " b VARCHAR"},
		},
		{
			name:     "Quoted field name with comma",
			input:    `"field,name" VARCHAR, b INTEGER`,
			expected: []string{`"field,name" VARCHAR`, ` b INTEGER`},
		},
		{
			name:     "Quoted field name with parentheses",
			input:    `"field(1)" VARCHAR, b INTEGER`,
			expected: []string{`"field(1)" VARCHAR`, ` b INTEGER`},
		},
		{
			name:     "Deeply nested",
			input:    "a STRUCT(x STRUCT(m INT, n INT), y INT), b VARCHAR",
			expected: []string{"a STRUCT(x STRUCT(m INT, n INT), y INT)", " b VARCHAR"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := engine.SplitTopLevelCommaForTesting(tt.input)
			assert.Equal(t, len(tt.expected), len(result))
			for i := range tt.expected {
				assert.Equal(t, tt.expected[i], result[i])
			}
		})
	}
}

func TestBuildJSONSchema_Metadata(t *testing.T) {
	fields := []engine.SchemaField{
		{
			Name:         "id",
			Type:         "INTEGER",
			Required:     true,
			OriginalType: "INTEGER",
		},
		{
			Name:         "amount",
			Type:         "DECIMAL",
			Required:     true,
			OriginalType: "DECIMAL(10,2)",
			Precision:    intPtr(10),
			Scale:        intPtr(2),
		},
	}

	context := &engine.SchemaContext{
		Repository: "test-repo",
		Path:       "/data/test.parquet",
		Ref:        "main",
	}

	schema := engine.BuildJSONSchemaForTesting(fields, context)

	// Check top-level metadata
	assert.NotNil(t, schema.XIrminSchemaVersion)
	assert.Equal(t, "1.1.0", *schema.XIrminSchemaVersion)

	assert.NotNil(t, schema.XInferredBy)
	assert.Equal(t, "duckdb-information_schema", *schema.XInferredBy)

	assert.NotNil(t, schema.XIrmin)
	irminMeta := *schema.XIrmin
	assert.Equal(t, "test-repo", irminMeta["repository"])
	assert.Equal(t, "/data/test.parquet", irminMeta["path"])
	assert.Equal(t, "main", irminMeta["ref"])

	// Check field-level metadata
	amountField := schema.Properties["amount"]
	assert.NotNil(t, amountField.XOriginalDuckDBType)
	assert.Equal(t, "DECIMAL(10,2)", *amountField.XOriginalDuckDBType)
	assert.NotNil(t, amountField.XDecimalPrecision)
	assert.Equal(t, 10, *amountField.XDecimalPrecision)
	assert.NotNil(t, amountField.XDecimalScale)
	assert.Equal(t, 2, *amountField.XDecimalScale)
}

func TestPrimitiveSchema_ExtendedTypes(t *testing.T) {
	tests := []struct {
		name           string
		duckType       string
		expectedType   string
		expectedFormat *string
	}{
		{
			name:           "TIME type",
			duckType:       "TIME",
			expectedType:   "string",
			expectedFormat: strPtr("time"),
		},
		{
			name:           "UUID type",
			duckType:       "UUID",
			expectedType:   "string",
			expectedFormat: strPtr("uuid"),
		},
		{
			name:           "INET type",
			duckType:       "INET",
			expectedType:   "string",
			expectedFormat: strPtr("ip"),
		},
		{
			name:           "INTERVAL type",
			duckType:       "INTERVAL",
			expectedType:   "string",
			expectedFormat: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			field := engine.SchemaField{
				Name:         "test",
				Type:         tt.duckType,
				OriginalType: tt.duckType,
			}

			schema := engine.PrimitiveSchemaForTesting(tt.duckType, field)
			assert.Equal(t, tt.expectedType, schema.Type)

			if tt.expectedFormat != nil {
				assert.NotNil(t, schema.Format)
				assert.Equal(t, *tt.expectedFormat, *schema.Format)
			}
		})
	}
}

func TestPrimitiveSchema_BLOB(t *testing.T) {
	field := engine.SchemaField{
		Name:         "data",
		Type:         "BLOB",
		OriginalType: "BLOB",
	}

	schema := engine.PrimitiveSchemaForTesting("BLOB", field)

	assert.Equal(t, "string", schema.Type)
	assert.NotNil(t, schema.ContentEncoding)
	assert.Equal(t, "base64", *schema.ContentEncoding)
	assert.NotNil(t, schema.ContentMediaType)
	assert.Equal(t, "application/octet-stream", *schema.ContentMediaType)
}

func TestPrimitiveSchema_DecimalAsInteger(t *testing.T) {
	field := engine.SchemaField{
		Name:         "count",
		Type:         "DECIMAL",
		OriginalType: "DECIMAL(10,0)",
		Precision:    intPtr(10),
		Scale:        intPtr(0),
	}

	schema := engine.PrimitiveSchemaForTesting("DECIMAL", field)

	// DECIMAL with scale=0 should map to integer
	assert.Equal(t, "integer", schema.Type)
	assert.NotNil(t, schema.XDecimalPrecision)
	assert.Equal(t, 10, *schema.XDecimalPrecision)
	assert.NotNil(t, schema.XDecimalScale)
	assert.Equal(t, 0, *schema.XDecimalScale)
}

func TestUnmappedTypes(t *testing.T) {
	fields := []engine.SchemaField{
		{
			Name:         "id",
			Type:         "INTEGER",
			OriginalType: "INTEGER",
		},
		{
			Name:         "custom",
			Type:         "CUSTOM_TYPE",
			OriginalType: "CUSTOM_TYPE",
		},
	}

	schema := engine.BuildJSONSchemaForTesting(fields, nil)

	// Should have unmapped types diagnostics
	assert.NotNil(t, schema.XUnmappedTypes)
	unmapped := *schema.XUnmappedTypes
	assert.Equal(t, 1, len(unmapped))
	assert.Equal(t, "CUSTOM_TYPE", unmapped[0])
}

func TestArrayNoMinItems(t *testing.T) {
	fields := []engine.SchemaField{
		{
			Name:         "tags",
			Type:         "ARRAY<VARCHAR>",
			Required:     true, // Required in parent object
			OriginalType: "VARCHAR[]",
		},
	}

	schema := engine.BuildJSONSchemaForTesting(fields, nil)
	tagsField := schema.Properties["tags"]

	// Array should be required in parent's Required list
	assert.Equal(t, 1, len(schema.Required))
	assert.Equal(t, "tags", schema.Required[0])

	// But array itself should NOT have minItems set automatically
	assert.Nil(t, tagsField.MinItems)
}

func TestExtractArrayElementType(t *testing.T) {
	tests := []struct {
		name         string
		input        string
		expectedType string
	}{
		{
			name:         "ARRAY<INTEGER>",
			input:        "ARRAY<INTEGER>",
			expectedType: "INTEGER",
		},
		{
			name:         "ARRAY<VARCHAR>",
			input:        "ARRAY<VARCHAR>",
			expectedType: "VARCHAR",
		},
		{
			name:         "INTEGER[]",
			input:        "INTEGER[]",
			expectedType: "INTEGER",
		},
		{
			name:         "VARCHAR[]",
			input:        "VARCHAR[]",
			expectedType: "VARCHAR",
		},
		{
			name:         "ARRAY<DECIMAL>",
			input:        "ARRAY<DECIMAL>",
			expectedType: "DECIMAL",
		},
		{
			name:         "ARRAY<BOOLEAN>",
			input:        "ARRAY<BOOLEAN>",
			expectedType: "BOOLEAN",
		},
		{
			name:         "Case insensitive ARRAY<integer>",
			input:        "ARRAY<integer>",
			expectedType: "INTEGER",
		},
		{
			name:         "Whitespace handling ARRAY< INTEGER >",
			input:        "ARRAY< INTEGER >",
			expectedType: "INTEGER",
		},
		{
			name:         "Malformed type returns as-is",
			input:        "NOT_AN_ARRAY",
			expectedType: "NOT_AN_ARRAY",
		},
		{
			name:         "Incomplete array syntax",
			input:        "ARRAY<",
			expectedType: "ARRAY<",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := engine.ExtractArrayElementTypeForTesting(tt.input)
			assert.Equal(t, tt.expectedType, result)
		})
	}
}

func TestArrayElementMetadata(t *testing.T) {
	tests := []struct {
		name                    string
		arrayType               string
		originalType            string
		expectedElementType     string
		expectedElementMetadata string
	}{
		{
			name:                    "ARRAY<INTEGER> with original type",
			arrayType:               "ARRAY<INTEGER>",
			originalType:            "INTEGER[]",
			expectedElementType:     "integer",
			expectedElementMetadata: "INTEGER",
		},
		{
			name:                    "ARRAY<VARCHAR> with original type",
			arrayType:               "ARRAY<VARCHAR>",
			originalType:            "VARCHAR[]",
			expectedElementType:     "string",
			expectedElementMetadata: "VARCHAR",
		},
		{
			name:                    "ARRAY<DECIMAL> with precision/scale",
			arrayType:               "ARRAY<DECIMAL>",
			originalType:            "DECIMAL(10,2)[]",
			expectedElementType:     "number",
			expectedElementMetadata: "DECIMAL",
		},
		{
			name:                    "ARRAY<BOOLEAN>",
			arrayType:               "ARRAY<BOOLEAN>",
			originalType:            "BOOLEAN[]",
			expectedElementType:     "boolean",
			expectedElementMetadata: "BOOLEAN",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fields := []engine.SchemaField{
				{
					Name:         "test_array",
					Type:         tt.arrayType,
					Required:     true,
					OriginalType: tt.originalType,
				},
			}

			schema := engine.BuildJSONSchemaForTesting(fields, nil)
			arrayField := schema.Properties["test_array"]

			// Check array field metadata
			assert.Equal(t, "array", arrayField.Type)
			assert.NotNil(t, arrayField.Items)

			// Check element metadata - should reflect the element type, not the array type
			elementSchema := *arrayField.Items
			assert.Equal(t, tt.expectedElementType, elementSchema.Type)
			assert.NotNil(t, elementSchema.XOriginalDuckDBType)
			assert.Equal(t, tt.expectedElementMetadata, *elementSchema.XOriginalDuckDBType)
		})
	}
}

func TestParameterizedArrayElementTypes(t *testing.T) {
	tests := []struct {
		name                    string
		arrayType               string
		originalType            string
		expectedElementType     string
		expectedElementMetadata string
		expectedPrecision       *int
		expectedScale           *int
	}{
		{
			name:                    "ARRAY<DECIMAL(10,2)> with precision/scale",
			arrayType:               "ARRAY<DECIMAL(10,2)>",
			originalType:            "DECIMAL(10,2)[]",
			expectedElementType:     "number",
			expectedElementMetadata: "DECIMAL(10,2)",
			expectedPrecision:       intPtr(10),
			expectedScale:           intPtr(2),
		},
		{
			name:                    "ARRAY<NUMERIC(18,4)> with precision/scale",
			arrayType:               "ARRAY<NUMERIC(18,4)>",
			originalType:            "NUMERIC(18,4)[]",
			expectedElementType:     "number",
			expectedElementMetadata: "NUMERIC(18,4)",
			expectedPrecision:       intPtr(18),
			expectedScale:           intPtr(4),
		},
		{
			name:                    "ARRAY<DECIMAL(10)> with precision only",
			arrayType:               "ARRAY<DECIMAL(10)>",
			originalType:            "DECIMAL(10)[]",
			expectedElementType:     "number",
			expectedElementMetadata: "DECIMAL(10)",
			expectedPrecision:       intPtr(10),
			expectedScale:           nil,
		},
		{
			name:                    "ARRAY<DECIMAL(10,0)> with zero scale",
			arrayType:               "ARRAY<DECIMAL(10,0)>",
			originalType:            "DECIMAL(10,0)[]",
			expectedElementType:     "integer", // Should be integer when scale is 0
			expectedElementMetadata: "DECIMAL(10,0)",
			expectedPrecision:       intPtr(10),
			expectedScale:           intPtr(0),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fields := []engine.SchemaField{
				{
					Name:         "test_array",
					Type:         tt.arrayType,
					Required:     true,
					OriginalType: tt.originalType,
				},
			}

			schema := engine.BuildJSONSchemaForTesting(fields, nil)
			arrayField := schema.Properties["test_array"]

			// Check array field metadata
			assert.Equal(t, "array", arrayField.Type)
			assert.NotNil(t, arrayField.Items)

			// Check element metadata - should reflect the element type, not the array type
			elementSchema := *arrayField.Items
			assert.Equal(t, tt.expectedElementType, elementSchema.Type)
			assert.NotNil(t, elementSchema.XOriginalDuckDBType)
			assert.Equal(t, tt.expectedElementMetadata, *elementSchema.XOriginalDuckDBType)

			// Check precision and scale if expected
			if tt.expectedPrecision != nil {
				assert.NotNil(t, elementSchema.XDecimalPrecision)
				assert.Equal(t, *tt.expectedPrecision, *elementSchema.XDecimalPrecision)
			} else {
				assert.Nil(t, elementSchema.XDecimalPrecision)
			}

			if tt.expectedScale != nil {
				assert.NotNil(t, elementSchema.XDecimalScale)
				assert.Equal(t, *tt.expectedScale, *elementSchema.XDecimalScale)
			} else {
				assert.Nil(t, elementSchema.XDecimalScale)
			}
		})
	}
}

func TestParameterizedMapValueTypes(t *testing.T) {
	tests := []struct {
		name                  string
		mapType               string
		originalType          string
		expectedValueType     string
		expectedValueMetadata string
		expectedPrecision     *int
		expectedScale         *int
	}{
		{
			name:                  "MAP<VARCHAR,DECIMAL(10,2)> with precision/scale",
			mapType:               "MAP<VARCHAR,DECIMAL(10,2)>",
			originalType:          "MAP<VARCHAR,DECIMAL(10,2)>",
			expectedValueType:     "number",
			expectedValueMetadata: "DECIMAL(10,2)",
			expectedPrecision:     intPtr(10),
			expectedScale:         intPtr(2),
		},
		{
			name:                  "MAP<INTEGER,NUMERIC(18,4)> with precision/scale",
			mapType:               "MAP<INTEGER,NUMERIC(18,4)>",
			originalType:          "MAP<INTEGER,NUMERIC(18,4)>",
			expectedValueType:     "number",
			expectedValueMetadata: "NUMERIC(18,4)",
			expectedPrecision:     intPtr(18),
			expectedScale:         intPtr(4),
		},
		{
			name:                  "MAP<VARCHAR,DECIMAL(10)> with precision only",
			mapType:               "MAP<VARCHAR,DECIMAL(10)>",
			originalType:          "MAP<VARCHAR,DECIMAL(10)>",
			expectedValueType:     "number",
			expectedValueMetadata: "DECIMAL(10)",
			expectedPrecision:     intPtr(10),
			expectedScale:         nil,
		},
		{
			name:                  "MAP<INTEGER,DECIMAL(10,0)> with zero scale",
			mapType:               "MAP<INTEGER,DECIMAL(10,0)>",
			originalType:          "MAP<INTEGER,DECIMAL(10,0)>",
			expectedValueType:     "integer", // Should be integer when scale is 0
			expectedValueMetadata: "DECIMAL(10,0)",
			expectedPrecision:     intPtr(10),
			expectedScale:         intPtr(0),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fields := []engine.SchemaField{
				{
					Name:         "test_map",
					Type:         tt.mapType,
					Required:     true,
					OriginalType: tt.originalType,
				},
			}

			schema := engine.BuildJSONSchemaForTesting(fields, nil)
			mapField := schema.Properties["test_map"]

			// Check map field metadata
			assert.Equal(t, "object", mapField.Type)
			assert.NotNil(t, mapField.AdditionalProperties)

			// Check value metadata - should reflect the value type, not the map type
			valueSchema, ok := mapField.AdditionalProperties.(irminmodels.JSONSchema)
			assert.True(t, ok)
			assert.Equal(t, tt.expectedValueType, valueSchema.Type)
			assert.NotNil(t, valueSchema.XOriginalDuckDBType)
			assert.Equal(t, tt.expectedValueMetadata, *valueSchema.XOriginalDuckDBType)

			// Check precision and scale if expected
			if tt.expectedPrecision != nil {
				assert.NotNil(t, valueSchema.XDecimalPrecision)
				assert.Equal(t, *tt.expectedPrecision, *valueSchema.XDecimalPrecision)
			} else {
				assert.Nil(t, valueSchema.XDecimalPrecision)
			}

			if tt.expectedScale != nil {
				assert.NotNil(t, valueSchema.XDecimalScale)
				assert.Equal(t, *tt.expectedScale, *valueSchema.XDecimalScale)
			} else {
				assert.Nil(t, valueSchema.XDecimalScale)
			}
		})
	}
}

func TestParseFieldForElement(t *testing.T) {
	tests := []struct {
		name          string
		elementType   string
		expectedType  string
		expectedPrec  *int
		expectedScale *int
	}{
		{
			name:          "DECIMAL(10,2) element",
			elementType:   "DECIMAL(10,2)",
			expectedType:  "DECIMAL",
			expectedPrec:  intPtr(10),
			expectedScale: intPtr(2),
		},
		{
			name:          "NUMERIC(18,4) element",
			elementType:   "NUMERIC(18,4)",
			expectedType:  "DECIMAL",
			expectedPrec:  intPtr(18),
			expectedScale: intPtr(4),
		},
		{
			name:          "DECIMAL(10) element",
			elementType:   "DECIMAL(10)",
			expectedType:  "DECIMAL",
			expectedPrec:  intPtr(10),
			expectedScale: nil,
		},
		{
			name:          "INTEGER element",
			elementType:   "INTEGER",
			expectedType:  "INTEGER",
			expectedPrec:  nil,
			expectedScale: nil,
		},
		{
			name:          "VARCHAR element",
			elementType:   "VARCHAR",
			expectedType:  "VARCHAR",
			expectedPrec:  nil,
			expectedScale: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			field := engine.ParseFieldForElementForTesting("test_element", tt.elementType, true)

			assert.Equal(t, tt.expectedType, field.Type)
			assert.Equal(t, tt.elementType, field.OriginalType)

			if tt.expectedPrec != nil {
				assert.NotNil(t, field.Precision)
				assert.Equal(t, *tt.expectedPrec, *field.Precision)
			} else {
				assert.Nil(t, field.Precision)
			}

			if tt.expectedScale != nil {
				assert.NotNil(t, field.Scale)
				assert.Equal(t, *tt.expectedScale, *field.Scale)
			} else {
				assert.Nil(t, field.Scale)
			}
		})
	}
}

// Helper functions
func intPtr(v int) *int {
	return &v
}

func strPtr(v string) *string {
	return &v
}
