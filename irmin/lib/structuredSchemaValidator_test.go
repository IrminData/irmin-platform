package lib_test

import (
	"context"
	"strings"
	"testing"

	"irmin-api/lib"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/zeebo/assert"
)

func TestValidateStructuredFileSchema_Integration(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Skip("Test suite not initialized")
	}
	ctx := context.Background()

	// 1. Valid CSV
	csvData := []byte("id,name,age\n1,Alice,30\n2,Bob,25")
	schema := &irminmodels.JSONSchema{
		Type: "object",
		Properties: map[string]irminmodels.JSONSchema{
			"id":   {Type: "integer"},
			"name": {Type: "string"},
			"age":  {Type: "integer"},
		},
		Required: []string{"id", "name"},
	}

	errors, warnings := lib.ValidateStructuredFileSchema(ctx, "test.csv", csvData, schema, ts.Env, ts.Logger)
	assert.Equal(t, 0, len(errors))
	assert.Equal(t, 0, len(warnings))

	// 2. Invalid CSV (Type Mismatch)
	// DuckDB schema inference might be flexible, but let's try to force a mismatch.
	// If we provide "not_an_int" in an integer column, DuckDB might treat the column as VARCHAR.
	csvDataInvalid := []byte("id,name,age\n1,Alice,not_an_int")
	errors, _ = lib.ValidateStructuredFileSchema(ctx, "invalid.csv", csvDataInvalid, schema, ts.Env, ts.Logger)
	assert.True(t, len(errors) > 0)
	foundTypeErr := false
	for _, e := range errors {
		// Error message should contain "but schema expects 'integer'"
		if containsString(e, "but schema expects 'integer'") {
			foundTypeErr = true
			break
		}
	}
	assert.True(t, foundTypeErr)

	// 3. Schema is Array
	arraySchema := &irminmodels.JSONSchema{
		Type: "array",
		Items: &irminmodels.JSONSchema{
			Type: "object",
			Properties: map[string]irminmodels.JSONSchema{
				"id": {Type: "integer"},
			},
		},
	}
	// Structured files (CSV/Parquet) are often treated as lists of records, so root is array of objects conceptually.
	// ValidateStructuredFileSchema handles schema.Type == "array" by validating against schema.Items.
	errors, _ = lib.ValidateStructuredFileSchema(ctx, "test_arr.csv", csvData, arraySchema, ts.Env, ts.Logger)
	assert.Equal(t, 0, len(errors))
}

func TestValidateFieldsAgainstSchema_MissingProperties(t *testing.T) {
	// Test the bug fix case: Schema with Required fields but no Properties
	// This test validates that required field validation works even when Properties is nil
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Skip("Test suite not initialized")
	}
	ctx := context.Background()

	schema := &irminmodels.JSONSchema{
		Type:     "object",
		Required: []string{"id", "name"},
		// Properties is nil - this was causing the bug
	}

	// CSV missing the "id" column
	csvDataMissing := []byte("name,age\nAlice,30")
	errors, warnings := lib.ValidateStructuredFileSchema(ctx, "missing.csv", csvDataMissing, schema, ts.Env, ts.Logger)

	// Should have error for missing required field "id"
	assert.True(t, len(errors) > 0)
	assert.True(t, containsError(errors, "Required field 'id' is missing from file"))

	// Should warn about unexpected fields since Properties is nil (all fields are unexpected)
	assert.True(t, len(warnings) > 0)
}

func TestValidateStructuredFileSchema_ExtraFields(t *testing.T) {
	ts := lib.GetTestSuite()
	if ts == nil {
		t.Skip("Test suite not initialized")
	}
	ctx := context.Background()

	schema := &irminmodels.JSONSchema{
		Type: "object",
		Properties: map[string]irminmodels.JSONSchema{
			"id":   {Type: "integer"},
			"name": {Type: "string"},
		},
	}

	// CSV with extra "age" column not in schema
	csvDataExtra := []byte("id,name,age\n1,Alice,30")
	errors, warnings := lib.ValidateStructuredFileSchema(ctx, "extra.csv", csvDataExtra, schema, ts.Env, ts.Logger)

	assert.Equal(t, 0, len(errors))
	assert.True(t, len(warnings) > 0)
	assert.True(t, containsWarning(warnings, "File contains unexpected field 'age' not defined in schema"))
}

func containsError(errors []string, target string) bool {
	for _, e := range errors {
		if e == target {
			return true
		}
	}
	return false
}

func containsWarning(warnings []string, target string) bool {
	for _, w := range warnings {
		if w == target {
			return true
		}
	}
	return false
}

func containsString(s string, substr string) bool {
	return strings.Contains(s, substr)
}
