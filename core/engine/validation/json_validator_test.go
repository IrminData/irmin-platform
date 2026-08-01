package validation_test

import (
	"context"
	"testing"

	"irmin-api/engine/validation"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/zeebo/assert"
)

func TestValidateJSONAgainstSchema_ValidObject(t *testing.T) {
	schema := &irminmodels.JSONSchema{
		Type: "object",
		Properties: map[string]irminmodels.JSONSchema{
			"id":   {Type: "integer"},
			"name": {Type: "string"},
		},
		Required: []string{"id"},
	}

	validJSON := []byte(`{"id": 1, "name": "Alice"}`)
	errors := validation.ValidateJSONAgainstSchema(context.Background(), "test.json", validJSON, schema)

	assert.Equal(t, 0, len(errors))
}

func TestValidateJSONAgainstSchema_MissingRequiredField(t *testing.T) {
	schema := &irminmodels.JSONSchema{
		Type: "object",
		Properties: map[string]irminmodels.JSONSchema{
			"id":   {Type: "integer"},
			"name": {Type: "string"},
		},
		Required: []string{"id"},
	}

	missingReqJSON := []byte(`{"name": "Alice"}`)
	errors := validation.ValidateJSONAgainstSchema(context.Background(), "test.json", missingReqJSON, schema)

	assert.True(t, len(errors) > 0)
	assert.Equal(t, validation.ValidationErrorMissingField, errors[0].Type)
	assert.Equal(t, "id", errors[0].FieldPath)
}

func TestValidateJSONAgainstSchema_TypeMismatch(t *testing.T) {
	schema := &irminmodels.JSONSchema{
		Type: "object",
		Properties: map[string]irminmodels.JSONSchema{
			"id":   {Type: "integer"},
			"name": {Type: "string"},
		},
		Required: []string{"id"},
	}

	invalidTypeJSON := []byte(`{"id": "not_an_int", "name": "Alice"}`)
	errors := validation.ValidateJSONAgainstSchema(context.Background(), "test.json", invalidTypeJSON, schema)

	assert.True(t, len(errors) > 0)
	assert.Equal(t, validation.ValidationErrorTypeMismatch, errors[0].Type)
}

func TestValidateJSONAgainstSchema_InvalidJSON(t *testing.T) {
	schema := &irminmodels.JSONSchema{
		Type: "object",
	}

	invalidJSON := []byte(`{not valid json}`)
	errors := validation.ValidateJSONAgainstSchema(context.Background(), "test.json", invalidJSON, schema)

	assert.True(t, len(errors) > 0)
	assert.Equal(t, validation.ValidationErrorFormat, errors[0].Type)
}

func TestValidateJSONAgainstSchema_NilSchema(t *testing.T) {
	validJSON := []byte(`{"id": 1}`)
	errors := validation.ValidateJSONAgainstSchema(context.Background(), "test.json", validJSON, nil)

	assert.Equal(t, 0, len(errors))
}

func TestValidateJSONAgainstSchema_IntegerType(t *testing.T) {
	schema := &irminmodels.JSONSchema{
		Type: "object",
		Properties: map[string]irminmodels.JSONSchema{
			"value": {Type: "integer"},
		},
	}

	// Valid integer
	errors := validation.ValidateJSONAgainstSchema(context.Background(), "test.json", []byte(`{"value": 10}`), schema)
	assert.Equal(t, 0, len(errors))

	// Float should fail for integer type
	errors = validation.ValidateJSONAgainstSchema(context.Background(), "test.json", []byte(`{"value": 10.5}`), schema)
	assert.True(t, len(errors) > 0)
	assert.Equal(t, validation.ValidationErrorTypeMismatch, errors[0].Type)
}

func TestValidateJSONAgainstSchema_BooleanType(t *testing.T) {
	schema := &irminmodels.JSONSchema{
		Type: "object",
		Properties: map[string]irminmodels.JSONSchema{
			"active": {Type: "boolean"},
		},
	}

	// Valid boolean
	errors := validation.ValidateJSONAgainstSchema(
		context.Background(),
		"test.json",
		[]byte(`{"active": true}`),
		schema,
	)
	assert.Equal(t, 0, len(errors))

	// String should fail for boolean type
	errors = validation.ValidateJSONAgainstSchema(
		context.Background(),
		"test.json",
		[]byte(`{"active": "true"}`),
		schema,
	)
	assert.True(t, len(errors) > 0)
	assert.Equal(t, validation.ValidationErrorTypeMismatch, errors[0].Type)
}

func TestValidateJSONAgainstSchema_ArrayType(t *testing.T) {
	schema := &irminmodels.JSONSchema{
		Type: "array",
		Items: &irminmodels.JSONSchema{
			Type: "object",
			Properties: map[string]irminmodels.JSONSchema{
				"id": {Type: "integer"},
			},
		},
	}

	// Valid array
	validArray := []byte(`[{"id": 1}, {"id": 2}]`)
	errors := validation.ValidateJSONAgainstSchema(context.Background(), "test.json", validArray, schema)
	assert.Equal(t, 0, len(errors))

	// Invalid item in array
	invalidArray := []byte(`[{"id": 1}, {"id": "not_int"}]`)
	errors = validation.ValidateJSONAgainstSchema(context.Background(), "test.json", invalidArray, schema)
	assert.True(t, len(errors) > 0)
	// Should have row index set
	assert.NotNil(t, errors[0].RowIndex)
	assert.Equal(t, 1, *errors[0].RowIndex)
}

func TestValidateJSONAgainstSchema_ArrayConstraints(t *testing.T) {
	minItems := 2
	maxItems := 5
	schema := &irminmodels.JSONSchema{
		Type:     "array",
		MinItems: &minItems,
		MaxItems: &maxItems,
		Items:    &irminmodels.JSONSchema{Type: "integer"},
	}

	// Too few items
	errors := validation.ValidateJSONAgainstSchema(context.Background(), "test.json", []byte(`[1]`), schema)
	assert.True(t, len(errors) > 0)
	assert.Equal(t, validation.ValidationErrorConstraint, errors[0].Type)

	// Valid number of items
	errors = validation.ValidateJSONAgainstSchema(context.Background(), "test.json", []byte(`[1, 2, 3]`), schema)
	assert.Equal(t, 0, len(errors))

	// Too many items
	errors = validation.ValidateJSONAgainstSchema(
		context.Background(),
		"test.json",
		[]byte(`[1, 2, 3, 4, 5, 6]`),
		schema,
	)
	assert.True(t, len(errors) > 0)
	assert.Equal(t, validation.ValidationErrorConstraint, errors[0].Type)
}

func TestValidateJSONAgainstSchema_StringConstraints(t *testing.T) {
	minLen := 3
	maxLen := 10
	schema := &irminmodels.JSONSchema{
		Type: "object",
		Properties: map[string]irminmodels.JSONSchema{
			"name": {Type: "string", MinLength: &minLen, MaxLength: &maxLen},
		},
	}

	// Too short
	errors := validation.ValidateJSONAgainstSchema(context.Background(), "test.json", []byte(`{"name": "ab"}`), schema)
	assert.True(t, len(errors) > 0)
	assert.Equal(t, validation.ValidationErrorConstraint, errors[0].Type)

	// Valid length
	errors = validation.ValidateJSONAgainstSchema(
		context.Background(),
		"test.json",
		[]byte(`{"name": "Alice"}`),
		schema,
	)
	assert.Equal(t, 0, len(errors))

	// Too long
	longNameJSON := []byte(`{"name": "Very Long Name Here"}`)
	errors = validation.ValidateJSONAgainstSchema(context.Background(), "test.json", longNameJSON, schema)
	assert.True(t, len(errors) > 0)
	assert.Equal(t, validation.ValidationErrorConstraint, errors[0].Type)
}

func TestValidateJSONAgainstSchema_NumberConstraints(t *testing.T) {
	minVal := 0.0
	maxVal := 100.0
	schema := &irminmodels.JSONSchema{
		Type: "object",
		Properties: map[string]irminmodels.JSONSchema{
			"score": {Type: "number", Minimum: &minVal, Maximum: &maxVal},
		},
	}

	// Below minimum
	errors := validation.ValidateJSONAgainstSchema(context.Background(), "test.json", []byte(`{"score": -5}`), schema)
	assert.True(t, len(errors) > 0)
	assert.Equal(t, validation.ValidationErrorConstraint, errors[0].Type)

	// Valid value
	errors = validation.ValidateJSONAgainstSchema(context.Background(), "test.json", []byte(`{"score": 50}`), schema)
	assert.Equal(t, 0, len(errors))

	// Above maximum
	errors = validation.ValidateJSONAgainstSchema(context.Background(), "test.json", []byte(`{"score": 150}`), schema)
	assert.True(t, len(errors) > 0)
	assert.Equal(t, validation.ValidationErrorConstraint, errors[0].Type)
}

func TestValidateJSONAgainstSchema_EnumValues(t *testing.T) {
	schema := &irminmodels.JSONSchema{
		Type: "object",
		Properties: map[string]irminmodels.JSONSchema{
			"status": {Type: "string", Enum: []any{"active", "inactive", "pending"}},
		},
	}

	// Valid enum value
	errors := validation.ValidateJSONAgainstSchema(
		context.Background(),
		"test.json",
		[]byte(`{"status": "active"}`),
		schema,
	)
	assert.Equal(t, 0, len(errors))

	// Invalid enum value
	errors = validation.ValidateJSONAgainstSchema(
		context.Background(),
		"test.json",
		[]byte(`{"status": "unknown"}`),
		schema,
	)
	assert.True(t, len(errors) > 0)
	assert.Equal(t, validation.ValidationErrorEnumValue, errors[0].Type)
}

func TestValidateJSONAgainstSchema_NullValue(t *testing.T) {
	schema := &irminmodels.JSONSchema{
		Type: "object",
		Properties: map[string]irminmodels.JSONSchema{
			"name": {Type: "string"},
		},
	}

	// Null value for non-null type
	errors := validation.ValidateJSONAgainstSchema(context.Background(), "test.json", []byte(`{"name": null}`), schema)
	assert.True(t, len(errors) > 0)
	assert.Equal(t, validation.ValidationErrorNullValue, errors[0].Type)
}

func TestValidateJSONAgainstSchema_NestedObject(t *testing.T) {
	schema := &irminmodels.JSONSchema{
		Type: "object",
		Properties: map[string]irminmodels.JSONSchema{
			"user": {
				Type: "object",
				Properties: map[string]irminmodels.JSONSchema{
					"email": {Type: "string"},
					"age":   {Type: "integer"},
				},
				Required: []string{"email"},
			},
		},
	}

	// Valid nested object
	validNested := []byte(`{"user": {"email": "test@example.com", "age": 25}}`)
	errors := validation.ValidateJSONAgainstSchema(context.Background(), "test.json", validNested, schema)
	assert.Equal(t, 0, len(errors))

	// Missing required field in nested object
	missingNested := []byte(`{"user": {"age": 25}}`)
	errors = validation.ValidateJSONAgainstSchema(context.Background(), "test.json", missingNested, schema)
	assert.True(t, len(errors) > 0)
	assert.Equal(t, "user.email", errors[0].FieldPath)
}

func TestValidateJSONAgainstSchema_FieldPathTracking(t *testing.T) {
	schema := &irminmodels.JSONSchema{
		Type: "object",
		Properties: map[string]irminmodels.JSONSchema{
			"users": {
				Type: "array",
				Items: &irminmodels.JSONSchema{
					Type: "object",
					Properties: map[string]irminmodels.JSONSchema{
						"profile": {
							Type: "object",
							Properties: map[string]irminmodels.JSONSchema{
								"name": {Type: "string"},
							},
						},
					},
				},
			},
		},
	}

	// Type error deep in nested structure
	deepError := []byte(`{"users": [{"profile": {"name": 123}}]}`)
	errors := validation.ValidateJSONAgainstSchema(context.Background(), "test.json", deepError, schema)
	assert.True(t, len(errors) > 0)
	assert.Equal(t, "users[0].profile.name", errors[0].FieldPath)
}

func TestGenerateValidationSuggestion(t *testing.T) {
	// Test with custom suggestion
	errWithSuggestion := validation.SchemaValidationError{
		Type:       validation.ValidationErrorMissingField,
		FieldPath:  "name",
		Suggestion: validation.Ptr("Add the name field"),
	}
	assert.Equal(t, "Add the name field", validation.GenerateValidationSuggestion(errWithSuggestion))

	// Test default suggestion for missing field
	errMissing := validation.SchemaValidationError{
		Type:      validation.ValidationErrorMissingField,
		FieldPath: "email",
	}
	suggestion := validation.GenerateValidationSuggestion(errMissing)
	assert.True(t, len(suggestion) > 0)

	// Test default suggestion for type mismatch
	errType := validation.SchemaValidationError{
		Type:         validation.ValidationErrorTypeMismatch,
		ExpectedType: validation.Ptr("string"),
	}
	suggestion = validation.GenerateValidationSuggestion(errType)
	assert.True(t, len(suggestion) > 0)
}

func TestGetTypeName(t *testing.T) {
	assert.Equal(t, "null", validation.GetTypeName(nil))
	assert.Equal(t, "boolean", validation.GetTypeName(true))
	assert.Equal(t, "number", validation.GetTypeName(float64(42)))
	assert.Equal(t, "string", validation.GetTypeName("hello"))
	assert.Equal(t, "array", validation.GetTypeName([]any{1, 2, 3}))
	assert.Equal(t, "object", validation.GetTypeName(map[string]any{"key": "value"}))
}

func TestJoinValidationPath(t *testing.T) {
	assert.Equal(t, "field", validation.JoinValidationPath("", "field"))
	assert.Equal(t, "parent.child", validation.JoinValidationPath("parent", "child"))
	assert.Equal(t, "a.b.c", validation.JoinValidationPath("a.b", "c"))
}
