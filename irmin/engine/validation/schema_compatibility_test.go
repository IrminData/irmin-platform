package validation_test

import (
	"strings"
	"testing"

	"irmin-api/engine/validation"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/zeebo/assert"
)

func TestAreSchemaTypesCompatible(t *testing.T) {
	// Same types are compatible
	assert.True(t, validation.AreSchemaTypesCompatible("string", "string"))
	assert.True(t, validation.AreSchemaTypesCompatible("integer", "integer"))
	assert.True(t, validation.AreSchemaTypesCompatible("number", "number"))
	assert.True(t, validation.AreSchemaTypesCompatible("boolean", "boolean"))
	assert.True(t, validation.AreSchemaTypesCompatible("array", "array"))
	assert.True(t, validation.AreSchemaTypesCompatible("object", "object"))

	// Integer can be widened to number or string
	assert.True(t, validation.AreSchemaTypesCompatible("integer", "number"))
	assert.True(t, validation.AreSchemaTypesCompatible("integer", "string"))

	// Number can be widened to string
	assert.True(t, validation.AreSchemaTypesCompatible("number", "string"))

	// Boolean can be widened to string
	assert.True(t, validation.AreSchemaTypesCompatible("boolean", "string"))

	// Null can be converted to anything
	assert.True(t, validation.AreSchemaTypesCompatible("null", "string"))
	assert.True(t, validation.AreSchemaTypesCompatible("null", "integer"))
	assert.True(t, validation.AreSchemaTypesCompatible("null", "object"))

	// Incompatible conversions
	assert.False(t, validation.AreSchemaTypesCompatible("string", "integer"))
	assert.False(t, validation.AreSchemaTypesCompatible("string", "number"))
	assert.False(t, validation.AreSchemaTypesCompatible("number", "integer"))
	assert.False(t, validation.AreSchemaTypesCompatible("object", "array"))
}

func TestGetSchemaCompatibilityIssues_NilDiff(t *testing.T) {
	issues := validation.GetSchemaCompatibilityIssues(nil)
	assert.Nil(t, issues)
}

func TestGetSchemaCompatibilityIssues_NoBreakingChanges(t *testing.T) {
	diff := &irminmodels.SchemaDiff{
		Compatible:      true,
		BreakingChanges: []irminmodels.SchemaFieldDiff{},
	}

	issues := validation.GetSchemaCompatibilityIssues(diff)
	assert.Equal(t, 0, len(issues))
}

func TestGetSchemaCompatibilityIssues_WithDescription(t *testing.T) {
	description := "Field 'email' was removed from the schema"
	diff := &irminmodels.SchemaDiff{
		Compatible: false,
		BreakingChanges: []irminmodels.SchemaFieldDiff{
			{
				FieldPath:   "email",
				ChangeType:  irminmodels.SchemaChangeRemoved,
				Description: &description,
			},
		},
	}

	issues := validation.GetSchemaCompatibilityIssues(diff)
	assert.Equal(t, 1, len(issues))
	assert.Equal(t, description, issues[0])
}

func TestGetSchemaCompatibilityIssues_WithoutDescription(t *testing.T) {
	diff := &irminmodels.SchemaDiff{
		Compatible: false,
		BreakingChanges: []irminmodels.SchemaFieldDiff{
			{
				FieldPath:  "email",
				ChangeType: irminmodels.SchemaChangeRemoved,
			},
		},
	}

	issues := validation.GetSchemaCompatibilityIssues(diff)
	assert.Equal(t, 1, len(issues))
	assert.True(t, len(issues[0]) > 0)
}

func TestFormatChangeDescription_Added(t *testing.T) {
	change := irminmodels.SchemaFieldDiff{
		FieldPath:  "newField",
		ChangeType: irminmodels.SchemaChangeAdded,
	}

	desc := validation.FormatChangeDescription(change)
	assert.True(t, len(desc) > 0)
	assert.True(t, strings.Contains(desc, "newField"))
	assert.True(t, strings.Contains(desc, "added"))
}

func TestFormatChangeDescription_Removed(t *testing.T) {
	change := irminmodels.SchemaFieldDiff{
		FieldPath:  "oldField",
		ChangeType: irminmodels.SchemaChangeRemoved,
	}

	desc := validation.FormatChangeDescription(change)
	assert.True(t, len(desc) > 0)
	assert.True(t, strings.Contains(desc, "oldField"))
	assert.True(t, strings.Contains(desc, "removed"))
}

func TestFormatChangeDescription_TypeChanged(t *testing.T) {
	sourceType := "string"
	targetType := "integer"
	change := irminmodels.SchemaFieldDiff{
		FieldPath:  "value",
		ChangeType: irminmodels.SchemaChangeTypeChanged,
		SourceType: &sourceType,
		TargetType: &targetType,
	}

	desc := validation.FormatChangeDescription(change)
	assert.True(t, len(desc) > 0)
	assert.True(t, strings.Contains(desc, "value"))
	assert.True(t, strings.Contains(desc, "string"))
	assert.True(t, strings.Contains(desc, "integer"))
}

func TestFormatChangeDescription_RequiredChanged(t *testing.T) {
	isRequired := true
	change := irminmodels.SchemaFieldDiff{
		FieldPath:  "name",
		ChangeType: irminmodels.SchemaChangeRequiredChanged,
		IsRequired: &isRequired,
	}

	desc := validation.FormatChangeDescription(change)
	assert.True(t, len(desc) > 0)
	assert.True(t, strings.Contains(desc, "name"))
	assert.True(t, strings.Contains(desc, "required"))
}

func TestFormatChangeDescription_NullabilityChanged(t *testing.T) {
	isNullable := true
	change := irminmodels.SchemaFieldDiff{
		FieldPath:  "optional",
		ChangeType: irminmodels.SchemaChangeNullabilityChanged,
		IsNullable: &isNullable,
	}

	desc := validation.FormatChangeDescription(change)
	assert.True(t, len(desc) > 0)
	assert.True(t, strings.Contains(desc, "optional"))
	assert.True(t, strings.Contains(desc, "nullable"))
}

func TestFormatChangeDescription_Modified(t *testing.T) {
	change := irminmodels.SchemaFieldDiff{
		FieldPath:  "data",
		ChangeType: irminmodels.SchemaChangeModified,
	}

	desc := validation.FormatChangeDescription(change)
	assert.True(t, len(desc) > 0)
	assert.True(t, strings.Contains(desc, "data"))
	assert.True(t, strings.Contains(desc, "modified"))
}

func TestCheckSchemaCompatibility_IdenticalSchemas(t *testing.T) {
	schema := &irminmodels.ObjectSchema{
		Type: irminmodels.ObjectTypeStructured,
		Schema: &irminmodels.JSONSchema{
			Type: "object",
			Properties: map[string]irminmodels.JSONSchema{
				"id":   {Type: "integer"},
				"name": {Type: "string"},
			},
		},
	}

	diff := validation.CheckSchemaCompatibility(schema, schema)
	assert.True(t, diff.Compatible)
	assert.Equal(t, 0, len(diff.BreakingChanges))
}
