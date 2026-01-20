package validation_test

import (
	"context"
	"testing"

	"irmin-api/engine/validation"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/zeebo/assert"
)

func TestValidateFile_ValidJSON(t *testing.T) {
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

	validJSON := []byte(`{"id": 1, "name": "Alice"}`)
	result := validation.ValidateFile(context.Background(), "test.json", validJSON, schema, nil)

	assert.True(t, result.Valid)
	assert.Equal(t, 0, len(result.Errors))
}

func TestValidateFile_InvalidJSON(t *testing.T) {
	schema := &irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeStructured,
		Schema: &irminmodels.JSONSchema{
			Type: "object",
			Properties: map[string]irminmodels.JSONSchema{
				"id": {Type: "integer"},
			},
			Required: []string{"id"},
		},
	}

	invalidJSON := []byte(`{"id": "not_an_int"}`)
	result := validation.ValidateFile(context.Background(), "test.json", invalidJSON, schema, nil)

	assert.False(t, result.Valid)
	assert.True(t, len(result.Errors) > 0)
}

func TestValidateFile_NilSchema(t *testing.T) {
	data := []byte(`{"any": "data"}`)
	result := validation.ValidateFile(context.Background(), "test.json", data, nil, nil)

	assert.False(t, result.Valid)
	assert.True(t, len(result.Errors) > 0)
}

func TestValidateFile_SizeConstraint(t *testing.T) {
	size := 10
	schema := &irminmodels.ObjectSchema{
		Size: &size,
	}

	// Data exceeds size limit
	data := []byte("12345678901234567890") // 20 bytes
	result := validation.ValidateFile(context.Background(), "test.txt", data, schema, nil)

	assert.False(t, result.Valid)
	assert.True(t, len(result.Errors) > 0)
	assert.Equal(t, validation.ValidationErrorConstraint, result.Errors[0].Type)
}

func TestValidateFile_ContentTypeMismatch(t *testing.T) {
	contentType := "text/csv"
	schema := &irminmodels.ObjectSchema{
		ContentType: &contentType,
	}

	// JSON file with CSV content type expectation
	data := []byte(`{"id": 1}`)
	result := validation.ValidateFile(context.Background(), "test.json", data, schema, nil)

	assert.False(t, result.Valid)
	assert.True(t, len(result.Errors) > 0)
}

func TestValidateFiles_MultipleFiles(t *testing.T) {
	schema := &irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeStructured,
		Schema: &irminmodels.JSONSchema{
			Type: "object",
			Properties: map[string]irminmodels.JSONSchema{
				"value": {Type: "integer"},
			},
		},
	}

	files := map[string][]byte{
		"file1.json": []byte(`{"value": 1}`),
		"file2.json": []byte(`{"value": 2}`),
	}

	result := validation.ValidateFiles(context.Background(), files, schema, nil)

	assert.True(t, result.Valid)
	assert.Equal(t, 0, len(result.Errors))
}

func TestValidateFiles_OneFileInvalid(t *testing.T) {
	schema := &irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeStructured,
		Schema: &irminmodels.JSONSchema{
			Type: "object",
			Properties: map[string]irminmodels.JSONSchema{
				"value": {Type: "integer"},
			},
		},
	}

	files := map[string][]byte{
		"file1.json": []byte(`{"value": 1}`),
		"file2.json": []byte(`{"value": "not_int"}`),
	}

	result := validation.ValidateFiles(context.Background(), files, schema, nil)

	assert.False(t, result.Valid)
	assert.True(t, len(result.Errors) > 0)
}

func TestValidateFiles_NilSchema(t *testing.T) {
	files := map[string][]byte{
		"file1.json": []byte(`{"value": 1}`),
	}

	result := validation.ValidateFiles(context.Background(), files, nil, nil)

	// Should add warning but be valid (skipping validation)
	assert.True(t, result.Valid)
	assert.True(t, len(result.Warnings) > 0)
}

func TestValidateFiles_GroupSchema(t *testing.T) {
	groupSchema := &irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeGroup,
		Children: []irminmodels.ObjectSchema{
			{
				Name: "users.json",
				Type: irminmodels.ObjectTypeStructured,
				Schema: &irminmodels.JSONSchema{
					Type: "object",
					Properties: map[string]irminmodels.JSONSchema{
						"name": {Type: "string"},
					},
				},
			},
			{
				Name: "orders.json",
				Type: irminmodels.ObjectTypeStructured,
				Schema: &irminmodels.JSONSchema{
					Type: "object",
					Properties: map[string]irminmodels.JSONSchema{
						"total": {Type: "number"},
					},
				},
			},
		},
	}

	files := map[string][]byte{
		"users.json":  []byte(`{"name": "Alice"}`),
		"orders.json": []byte(`{"total": 99.99}`),
	}

	result := validation.ValidateFiles(context.Background(), files, groupSchema, nil)

	assert.True(t, result.Valid)
	assert.Equal(t, 0, len(result.Errors))
}

func TestValidateFiles_GroupSchema_NoMatchingSchema(t *testing.T) {
	groupSchema := &irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeGroup,
		Children: []irminmodels.ObjectSchema{
			{
				Name: "users.json",
				Type: irminmodels.ObjectTypeStructured,
				Schema: &irminmodels.JSONSchema{
					Type: "object",
				},
			},
		},
	}

	files := map[string][]byte{
		"unknown.json": []byte(`{"data": "value"}`),
	}

	result := validation.ValidateFiles(context.Background(), files, groupSchema, nil)

	// Should add warning for unmatched file
	assert.True(t, len(result.Warnings) > 0)
}

func TestIsJSONFile(t *testing.T) {
	// Test with content type
	jsonContentType := "application/json"
	assert.True(t, validation.IsJSONFile("data.json", &jsonContentType))

	csvContentType := "text/csv"
	assert.False(t, validation.IsJSONFile("data.csv", &csvContentType))

	// JSONL should not be treated as JSON (single-document)
	jsonlContentType := "application/jsonl"
	assert.False(t, validation.IsJSONFile("data.jsonl", &jsonlContentType))

	// Test with filename only
	assert.True(t, validation.IsJSONFile("data.json", nil))
	assert.False(t, validation.IsJSONFile("data.csv", nil))
	assert.False(t, validation.IsJSONFile("data.jsonl", nil))
}

func TestValidateContentType(t *testing.T) {
	// Matching content type
	err := validation.ValidateContentType("data.json", "application/json")
	assert.Nil(t, err)

	err = validation.ValidateContentType("data.csv", "text/csv")
	assert.Nil(t, err)

	// Mismatched content type
	err = validation.ValidateContentType("data.json", "text/csv")
	assert.NotNil(t, err)

	// No extension - should pass
	err = validation.ValidateContentType("noext", "application/json")
	assert.Nil(t, err)

	// Unknown extension - should pass
	err = validation.ValidateContentType("data.xyz", "application/custom")
	assert.Nil(t, err)
}

func TestGetBaseName(t *testing.T) {
	assert.Equal(t, "file.json", validation.GetBaseName("file.json"))
	assert.Equal(t, "file.json", validation.GetBaseName("path/to/file.json"))
	assert.Equal(t, "file.json", validation.GetBaseName("path\\to\\file.json"))
	assert.Equal(t, "file.json", validation.GetBaseName("/absolute/path/file.json"))
}

func TestNewValidResult(t *testing.T) {
	result := validation.NewValidResult()

	assert.True(t, result.Valid)
	assert.Equal(t, 0, len(result.Errors))
	assert.Equal(t, 0, len(result.Warnings))
}

func TestNewInvalidResult(t *testing.T) {
	fileName := "test.json"
	err := validation.SchemaValidationError{
		Type:      validation.ValidationErrorMissingField,
		FieldPath: "id",
		Message:   "required field 'id' is missing",
		FileName:  &fileName,
	}

	result := validation.NewInvalidResult(err)

	assert.False(t, result.Valid)
	assert.Equal(t, 1, len(result.Errors))
	assert.Equal(t, validation.ValidationErrorMissingField, result.Errors[0].Type)
}
