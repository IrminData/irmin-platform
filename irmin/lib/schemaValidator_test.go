package lib_test

import (
	"testing"

	"irmin-api/lib"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/zeebo/assert"
)

func TestValidateDataAgainstSchema_JSON(t *testing.T) {
	schema := &irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeStructured,
		Schema: &irminmodels.JSONSchema{
			Type: "object",
			Properties: map[string]irminmodels.JSONSchema{
				"id":   {Type: "integer"},
				"name": {Type: "string"},
			},
			Required: []string{"id"},
		},
	}

	// Valid JSON
	validJSON := []byte(`{"id": 1, "name": "Alice"}`)
	result := lib.ValidateDataAgainstSchema("test.json", validJSON, schema)
	assert.True(t, result.Valid)
	assert.Equal(t, 0, len(result.Errors))

	// Invalid JSON (Type Mismatch)
	invalidTypeJSON := []byte(`{"id": "not_an_int", "name": "Alice"}`)
	result = lib.ValidateDataAgainstSchema("test.json", invalidTypeJSON, schema)
	assert.False(t, result.Valid)
	assert.True(t, len(result.Errors) > 0)

	// Missing Required
	missingReqJSON := []byte(`{"name": "Alice"}`)
	result = lib.ValidateDataAgainstSchema("test.json", missingReqJSON, schema)
	assert.False(t, result.Valid)
	assert.True(t, len(result.Errors) > 0)
}

func TestValidateDataAgainstSchema_ContentType(t *testing.T) {
	contentTypeJSON := "application/json"
	contentTypeCSV := "text/csv"

	// Matching content type
	schema := &irminmodels.ObjectSchema{
		Type:        irminmodels.ObjectTypeStructured,
		ContentType: &contentTypeJSON,
	}
	result := lib.ValidateDataAgainstSchema("test.json", []byte("{}"), schema)
	assert.True(t, result.Valid)

	// Mismatched content type
	schema.ContentType = &contentTypeCSV
	result = lib.ValidateDataAgainstSchema("test.json", []byte("{}"), schema)
	assert.False(t, result.Valid)
}

func TestValidateDataAgainstSchema_JSONTypes(t *testing.T) {
	// Test various JSON types through the public API

	// Integer
	intSchema := &irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeStructured,
		Schema: &irminmodels.JSONSchema{
			Type: "object",
			Properties: map[string]irminmodels.JSONSchema{
				"value": {Type: "integer"},
			},
		},
	}
	result := lib.ValidateDataAgainstSchema("test.json", []byte(`{"value": 10}`), intSchema)
	assert.True(t, result.Valid)

	result = lib.ValidateDataAgainstSchema("test.json", []byte(`{"value": 10.5}`), intSchema)
	assert.False(t, result.Valid)

	// Boolean
	boolSchema := &irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeStructured,
		Schema: &irminmodels.JSONSchema{
			Type: "object",
			Properties: map[string]irminmodels.JSONSchema{
				"active": {Type: "boolean"},
			},
		},
	}
	result = lib.ValidateDataAgainstSchema("test.json", []byte(`{"active": true}`), boolSchema)
	assert.True(t, result.Valid)

	result = lib.ValidateDataAgainstSchema("test.json", []byte(`{"active": "true"}`), boolSchema)
	assert.False(t, result.Valid)
}

func TestValidateDataAgainstSchema_NilSchema(t *testing.T) {
	result := lib.ValidateDataAgainstSchema("test.json", []byte("{}"), nil)
	assert.False(t, result.Valid)
	assert.Equal(t, "No schema provided for validation", result.Errors[0])
}

func TestValidateDataAgainstSchema_SizeLimit(t *testing.T) {
	size := 10
	schema := &irminmodels.ObjectSchema{
		Size: &size,
	}
	data := []byte("12345678901") // 11 bytes
	result := lib.ValidateDataAgainstSchema("test.txt", data, schema)
	assert.False(t, result.Valid)
	assert.True(t, len(result.Errors) > 0)
}
