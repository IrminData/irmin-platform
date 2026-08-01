package validation

import (
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// CheckSchemaCompatibility compares a data schema against a target connector schema.
// Returns a SchemaDiff indicating whether the schemas are compatible and what differences exist.
// This is useful for pre-flight checks before push operations to ensure data will be accepted.
func CheckSchemaCompatibility(
	dataSchema *ObjectSchema,
	targetSchema *ObjectSchema,
) *SchemaDiff {
	return CompareSchemas(dataSchema, targetSchema)
}

// AreSchemaTypesCompatible checks if two schema types are compatible for data operations.
// Returns true if data conforming to sourceType can be safely converted to targetType.
func AreSchemaTypesCompatible(sourceType, targetType string) bool {
	if sourceType == targetType {
		return true
	}

	// Define compatible type conversions
	compatibleConversions := map[string][]string{
		"integer": {"number", "string"},
		"number":  {"string"},
		"boolean": {"string"},
		"null":    {"string", "integer", "number", "boolean", "array", "object"},
	}

	if compatible, ok := compatibleConversions[sourceType]; ok {
		for _, t := range compatible {
			if t == targetType {
				return true
			}
		}
	}

	return false
}

// GetSchemaCompatibilityIssues returns a list of human-readable compatibility issues.
// This provides a simple string list for quick display without the full SchemaDiff structure.
func GetSchemaCompatibilityIssues(diff *SchemaDiff) []string {
	if diff == nil {
		return nil
	}

	var issues []string

	for _, change := range diff.BreakingChanges {
		if change.Description != nil {
			issues = append(issues, *change.Description)
		} else {
			issues = append(issues, formatChangeDescription(change))
		}
	}

	return issues
}

// formatChangeDescription creates a description for a schema change.
func formatChangeDescription(change irminmodels.SchemaFieldDiff) string {
	switch change.ChangeType {
	case irminmodels.SchemaChangeAdded:
		return "Field '" + change.FieldPath + "' was added"
	case irminmodels.SchemaChangeRemoved:
		return "Field '" + change.FieldPath + "' was removed"
	case irminmodels.SchemaChangeTypeChanged:
		sourceType := "unknown"
		targetType := "unknown"
		if change.SourceType != nil {
			sourceType = *change.SourceType
		}
		if change.TargetType != nil {
			targetType = *change.TargetType
		}
		return "Field '" + change.FieldPath + "' type changed from " + sourceType + " to " + targetType
	case irminmodels.SchemaChangeRequiredChanged:
		if change.IsRequired != nil && *change.IsRequired {
			return "Field '" + change.FieldPath + "' is now required"
		}
		return "Field '" + change.FieldPath + "' is no longer required"
	case irminmodels.SchemaChangeNullabilityChanged:
		if change.IsNullable != nil && *change.IsNullable {
			return "Field '" + change.FieldPath + "' is now nullable"
		}
		return "Field '" + change.FieldPath + "' is no longer nullable"
	case irminmodels.SchemaChangeModified:
		return "Field '" + change.FieldPath + "' was modified"
	}
	return "Field '" + change.FieldPath + "' was modified"
}
