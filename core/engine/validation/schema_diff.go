// Package validation provides schema diff functionality for comparing ObjectSchemas.
package validation

import (
	"fmt"
	"slices"
	"strings"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// CompareSchemas compares two ObjectSchemas and returns a detailed diff.
// The source is typically the current/existing schema, target is the new/expected schema.
func CompareSchemas(source, target *irminmodels.ObjectSchema) *irminmodels.SchemaDiff {
	diff := &irminmodels.SchemaDiff{
		Compatible:         true,
		BreakingChanges:    []irminmodels.SchemaFieldDiff{},
		NonBreakingChanges: []irminmodels.SchemaFieldDiff{},
	}

	if source == nil && target == nil {
		diff.Summary = "Both schemas are nil"
		return diff
	}

	if source == nil {
		diff.Summary = "Source schema is nil, target has schema"
		return diff
	}

	if target == nil {
		diff.Summary = "Target schema is nil, source has schema"
		return diff
	}

	// Set schema paths
	sourcePath := source.Path
	targetPath := target.Path
	diff.SourceSchemaPath = &sourcePath
	diff.TargetSchemaPath = &targetPath

	// Compare based on schema type
	switch {
	case source.Type == irminmodels.ObjectTypeGroup && target.Type == irminmodels.ObjectTypeGroup:
		compareGroupSchemas(source, target, "", diff)
	case source.Type == irminmodels.ObjectTypeStructured && target.Type == irminmodels.ObjectTypeStructured:
		compareStructuredSchemas(source, target, source.Name, diff)
	default:
		if source.Type != target.Type {
			typeChange := irminmodels.SchemaFieldDiff{
				FieldPath:  source.Name,
				ChangeType: irminmodels.SchemaChangeTypeChanged,
				SourceType: ptrStr(string(source.Type)),
				TargetType: ptrStr(string(target.Type)),
			}
			desc := fmt.Sprintf("Schema type changed from %s to %s", source.Type, target.Type)
			typeChange.Description = &desc
			diff.BreakingChanges = append(diff.BreakingChanges, typeChange)
		}
	}

	// Update compatibility flag
	diff.Compatible = len(diff.BreakingChanges) == 0

	// Generate summary
	diff.Summary = generateDiffSummary(diff)

	return diff
}

// compareGroupSchemas compares two group schemas by comparing their children.
func compareGroupSchemas(
	source, target *irminmodels.ObjectSchema,
	basePath string,
	diff *irminmodels.SchemaDiff,
) {
	// Build maps of children by name for efficient lookup
	sourceChildren := make(map[string]*irminmodels.ObjectSchema)
	for i := range source.Children {
		child := &source.Children[i]
		sourceChildren[child.Name] = child
	}

	targetChildren := make(map[string]*irminmodels.ObjectSchema)
	for i := range target.Children {
		child := &target.Children[i]
		targetChildren[child.Name] = child
	}

	// Find removed children (in source but not in target)
	for name, sourceChild := range sourceChildren {
		if _, exists := targetChildren[name]; !exists {
			fieldPath := joinDiffPath(basePath, name)
			removed := irminmodels.SchemaFieldDiff{
				FieldPath:  fieldPath,
				ChangeType: irminmodels.SchemaChangeRemoved,
				SourceType: ptrStr(string(sourceChild.Type)),
			}
			desc := fmt.Sprintf("Schema '%s' was removed", name)
			removed.Description = &desc
			// Removing a schema is breaking if it contained required data
			diff.BreakingChanges = append(diff.BreakingChanges, removed)
		}
	}

	// Find added children (in target but not in source)
	for name, targetChild := range targetChildren {
		if _, exists := sourceChildren[name]; !exists {
			fieldPath := joinDiffPath(basePath, name)
			added := irminmodels.SchemaFieldDiff{
				FieldPath:  fieldPath,
				ChangeType: irminmodels.SchemaChangeAdded,
				TargetType: ptrStr(string(targetChild.Type)),
			}
			desc := fmt.Sprintf("Schema '%s' was added", name)
			added.Description = &desc
			diff.NonBreakingChanges = append(diff.NonBreakingChanges, added)
		}
	}

	// Compare children that exist in both
	for name, sourceChild := range sourceChildren {
		if targetChild, exists := targetChildren[name]; exists {
			childPath := joinDiffPath(basePath, name)

			// Check for type changes between children
			if sourceChild.Type != targetChild.Type {
				typeChange := irminmodels.SchemaFieldDiff{
					FieldPath:  childPath,
					ChangeType: irminmodels.SchemaChangeTypeChanged,
					SourceType: ptrStr(string(sourceChild.Type)),
					TargetType: ptrStr(string(targetChild.Type)),
				}
				desc := fmt.Sprintf("Schema type changed from %s to %s", sourceChild.Type, targetChild.Type)
				typeChange.Description = &desc
				// Type changes between object schema types are always breaking
				diff.BreakingChanges = append(diff.BreakingChanges, typeChange)
				continue
			}

			// Compare based on matching types
			switch sourceChild.Type {
			case irminmodels.ObjectTypeStructured:
				compareStructuredSchemas(sourceChild, targetChild, childPath, diff)

			case irminmodels.ObjectTypeGroup:
				// Recursively compare nested groups
				compareGroupSchemas(sourceChild, targetChild, childPath, diff)

			case irminmodels.ObjectTypeBinary:
				// Compare binary schema restrictions (content type, size, etc.)
				compareBinarySchemas(sourceChild, targetChild, childPath, diff)
			}
		}
	}
}

// compareStructuredSchemas compares two structured ObjectSchemas.
func compareStructuredSchemas(
	source, target *irminmodels.ObjectSchema,
	basePath string,
	diff *irminmodels.SchemaDiff,
) {
	switch {
	case source.Schema != nil && target.Schema != nil:
		compareJSONSchemas(source.Schema, target.Schema, basePath, diff)
	case source.Schema == nil && target.Schema != nil:
		// Schema was added (more strict validation)
		change := irminmodels.SchemaFieldDiff{
			FieldPath:  basePath,
			ChangeType: irminmodels.SchemaChangeModified,
		}
		desc := "JSON schema validation was added"
		change.Description = &desc
		diff.BreakingChanges = append(diff.BreakingChanges, change)
	case source.Schema != nil && target.Schema == nil:
		// Schema was removed (less strict validation)
		change := irminmodels.SchemaFieldDiff{
			FieldPath:  basePath,
			ChangeType: irminmodels.SchemaChangeModified,
		}
		desc := "JSON schema validation was removed"
		change.Description = &desc
		diff.NonBreakingChanges = append(diff.NonBreakingChanges, change)
	}
}

// compareBinarySchemas compares restrictions on binary object schemas.
func compareBinarySchemas(
	source, target *irminmodels.ObjectSchema,
	basePath string,
	diff *irminmodels.SchemaDiff,
) {
	// Compare content type restrictions
	sourceContentType := ""
	targetContentType := ""
	if source.ContentType != nil {
		sourceContentType = *source.ContentType
	}
	if target.ContentType != nil {
		targetContentType = *target.ContentType
	}

	if sourceContentType != targetContentType {
		change := irminmodels.SchemaFieldDiff{
			FieldPath:  basePath,
			ChangeType: irminmodels.SchemaChangeModified,
			SourceType: ptrStr(sourceContentType),
			TargetType: ptrStr(targetContentType),
		}
		desc := fmt.Sprintf("Content type changed from '%s' to '%s'", sourceContentType, targetContentType)
		change.Description = &desc
		// Changing expected content type is breaking
		diff.BreakingChanges = append(diff.BreakingChanges, change)
	}

	// Compare restrictions if present
	if source.Restrictions != nil || target.Restrictions != nil {
		compareDiffRestrictions(source.Restrictions, target.Restrictions, basePath, diff)
	}
}

// compareDiffRestrictions compares GroupSchemaRestrictions between schemas.
func compareDiffRestrictions(
	source, target *irminmodels.GroupSchemaRestrictions,
	basePath string,
	diff *irminmodels.SchemaDiff,
) {
	// Handle nil cases
	if source == nil && target == nil {
		return
	}

	if source == nil {
		// Restrictions were added (more strict)
		change := irminmodels.SchemaFieldDiff{
			FieldPath:  basePath,
			ChangeType: irminmodels.SchemaChangeModified,
		}
		desc := "Schema restrictions were added"
		change.Description = &desc
		diff.BreakingChanges = append(diff.BreakingChanges, change)
		return
	}

	if target == nil {
		// Restrictions were removed (less strict)
		change := irminmodels.SchemaFieldDiff{
			FieldPath:  basePath,
			ChangeType: irminmodels.SchemaChangeModified,
		}
		desc := "Schema restrictions were removed"
		change.Description = &desc
		diff.NonBreakingChanges = append(diff.NonBreakingChanges, change)
		return
	}

	// Compare size restrictions
	if (source.MaxSize != nil || target.MaxSize != nil) &&
		(source.MaxSize == nil || target.MaxSize == nil || *source.MaxSize != *target.MaxSize) {
		change := irminmodels.SchemaFieldDiff{
			FieldPath:  basePath + ".maxSize",
			ChangeType: irminmodels.SchemaChangeModified,
		}
		if target.MaxSize != nil && (source.MaxSize == nil || *target.MaxSize < *source.MaxSize) {
			desc := "Maximum size restriction became more strict"
			change.Description = &desc
			diff.BreakingChanges = append(diff.BreakingChanges, change)
		} else {
			desc := "Maximum size restriction changed"
			change.Description = &desc
			diff.NonBreakingChanges = append(diff.NonBreakingChanges, change)
		}
	}
}

// compareJSONSchemas compares two JSONSchemas and populates the diff.
func compareJSONSchemas(
	source, target *irminmodels.JSONSchema,
	basePath string,
	diff *irminmodels.SchemaDiff,
) {
	// Compare types
	if source.Type != target.Type {
		typeChange := irminmodels.SchemaFieldDiff{
			FieldPath:  basePath,
			ChangeType: irminmodels.SchemaChangeTypeChanged,
			SourceType: &source.Type,
			TargetType: &target.Type,
		}
		desc := fmt.Sprintf("Type changed from %s to %s", source.Type, target.Type)
		typeChange.Description = &desc

		if isBreakingTypeChange(source.Type, target.Type) {
			diff.BreakingChanges = append(diff.BreakingChanges, typeChange)
		} else {
			diff.NonBreakingChanges = append(diff.NonBreakingChanges, typeChange)
		}
	}

	// Compare required fields
	compareDiffRequiredFields(source, target, basePath, diff)

	// Compare properties for object types
	if source.Type == "object" && target.Type == "object" {
		compareDiffProperties(
			source.Properties,
			target.Properties,
			source.Required,
			target.Required,
			basePath,
			diff,
		)
	}

	// Compare items for array types
	if source.Type == "array" && target.Type == "array" {
		itemPath := basePath + "[]"
		switch {
		case source.Items != nil && target.Items != nil:
			compareJSONSchemas(source.Items, target.Items, itemPath, diff)
		case source.Items == nil && target.Items != nil:
			// Items schema was added (more strict - now validates array items)
			change := irminmodels.SchemaFieldDiff{
				FieldPath:  itemPath,
				ChangeType: irminmodels.SchemaChangeAdded,
				TargetType: &target.Items.Type,
			}
			desc := "Array items schema was added (items now validated)"
			change.Description = &desc
			// Adding item validation is breaking - previously any items were allowed
			diff.BreakingChanges = append(diff.BreakingChanges, change)
		case source.Items != nil && target.Items == nil:
			// Items schema was removed (less strict - no longer validates array items)
			change := irminmodels.SchemaFieldDiff{
				FieldPath:  itemPath,
				ChangeType: irminmodels.SchemaChangeRemoved,
				SourceType: &source.Items.Type,
			}
			desc := "Array items schema was removed (items no longer validated)"
			change.Description = &desc
			// Removing item validation is non-breaking - allows more flexibility
			diff.NonBreakingChanges = append(diff.NonBreakingChanges, change)
		}
	}
}

// compareDiffRequiredFields compares the required field lists between schemas.
// Only reports changes for fields that exist in BOTH source and target properties
// to avoid duplicates with compareDiffProperties() which handles added/removed fields.
func compareDiffRequiredFields(
	source, target *irminmodels.JSONSchema,
	basePath string,
	diff *irminmodels.SchemaDiff,
) {
	// Fields that became required (breaking) - only if field exists in both
	for _, field := range target.Required {
		if !slices.Contains(source.Required, field) {
			// Only report if field existed in source (otherwise compareDiffProperties handles it)
			if _, existsInSource := source.Properties[field]; existsInSource {
				fieldPath := joinDiffPath(basePath, field)
				change := irminmodels.SchemaFieldDiff{
					FieldPath:   fieldPath,
					ChangeType:  irminmodels.SchemaChangeRequiredChanged,
					WasRequired: ptrBool(false),
					IsRequired:  ptrBool(true),
				}
				desc := fmt.Sprintf("Field '%s' is now required", field)
				change.Description = &desc
				diff.BreakingChanges = append(diff.BreakingChanges, change)
			}
		}
	}

	// Fields that became optional (non-breaking) - only if field still exists in target
	for _, field := range source.Required {
		if !slices.Contains(target.Required, field) {
			// Only report if field still exists in target (otherwise compareDiffProperties handles it)
			if _, existsInTarget := target.Properties[field]; existsInTarget {
				fieldPath := joinDiffPath(basePath, field)
				change := irminmodels.SchemaFieldDiff{
					FieldPath:   fieldPath,
					ChangeType:  irminmodels.SchemaChangeRequiredChanged,
					WasRequired: ptrBool(true),
					IsRequired:  ptrBool(false),
				}
				desc := fmt.Sprintf("Field '%s' is no longer required", field)
				change.Description = &desc
				diff.NonBreakingChanges = append(diff.NonBreakingChanges, change)
			}
		}
	}
}

// compareDiffProperties compares property definitions between two object schemas.
func compareDiffProperties(
	sourceProps, targetProps map[string]irminmodels.JSONSchema,
	_, targetRequired []string,
	basePath string,
	diff *irminmodels.SchemaDiff,
) {
	// Find removed properties
	for name, sourceProp := range sourceProps {
		if _, exists := targetProps[name]; !exists {
			fieldPath := joinDiffPath(basePath, name)
			removed := irminmodels.SchemaFieldDiff{
				FieldPath:  fieldPath,
				ChangeType: irminmodels.SchemaChangeRemoved,
				SourceType: &sourceProp.Type,
			}
			desc := fmt.Sprintf("Field '%s' was removed", name)
			removed.Description = &desc
			// Removing a field is breaking
			diff.BreakingChanges = append(diff.BreakingChanges, removed)
		}
	}

	// Find added properties
	for name, targetProp := range targetProps {
		if _, exists := sourceProps[name]; !exists {
			fieldPath := joinDiffPath(basePath, name)
			added := irminmodels.SchemaFieldDiff{
				FieldPath:  fieldPath,
				ChangeType: irminmodels.SchemaChangeAdded,
				TargetType: &targetProp.Type,
			}
			desc := fmt.Sprintf("Field '%s' was added", name)
			added.Description = &desc

			// Adding a required field is breaking
			if slices.Contains(targetRequired, name) {
				added.IsRequired = ptrBool(true)
				diff.BreakingChanges = append(diff.BreakingChanges, added)
			} else {
				diff.NonBreakingChanges = append(diff.NonBreakingChanges, added)
			}
		}
	}

	// Compare properties that exist in both
	for name, sourceProp := range sourceProps {
		if targetProp, exists := targetProps[name]; exists {
			fieldPath := joinDiffPath(basePath, name)
			compareJSONSchemas(&sourceProp, &targetProp, fieldPath, diff)
		}
	}
}

// isBreakingTypeChange determines if a type change is breaking.
func isBreakingTypeChange(sourceType, targetType string) bool {
	// Compatible type changes (widening)
	compatibleChanges := map[string][]string{
		"integer": {"number"},        // integer -> number is ok
		"null":    {"string", "any"}, // null -> string/any is ok
	}

	if compatible, ok := compatibleChanges[sourceType]; ok {
		return !slices.Contains(compatible, targetType)
	}

	// All other type changes are breaking
	return true
}

// IsBreakingChange determines if a single field diff represents a breaking change.
func IsBreakingChange(fieldDiff irminmodels.SchemaFieldDiff) bool {
	switch fieldDiff.ChangeType {
	case irminmodels.SchemaChangeRemoved:
		return true
	case irminmodels.SchemaChangeTypeChanged:
		if fieldDiff.SourceType != nil && fieldDiff.TargetType != nil {
			return isBreakingTypeChange(*fieldDiff.SourceType, *fieldDiff.TargetType)
		}
		return true
	case irminmodels.SchemaChangeRequiredChanged:
		// Becoming required is breaking
		if fieldDiff.IsRequired != nil && *fieldDiff.IsRequired {
			return true
		}
		return false
	case irminmodels.SchemaChangeNullabilityChanged:
		// Becoming non-nullable is breaking
		if fieldDiff.IsNullable != nil && !*fieldDiff.IsNullable {
			return true
		}
		return false
	case irminmodels.SchemaChangeAdded:
		// Adding a required field is breaking
		if fieldDiff.IsRequired != nil && *fieldDiff.IsRequired {
			return true
		}
		return false
	case irminmodels.SchemaChangeModified:
		// Generic modification is not necessarily breaking
		return false
	}
	return false
}

// generateDiffSummary creates a human-readable summary of the diff.
func generateDiffSummary(diff *irminmodels.SchemaDiff) string {
	breaking := len(diff.BreakingChanges)
	nonBreaking := len(diff.NonBreakingChanges)

	if breaking == 0 && nonBreaking == 0 {
		return "No schema changes detected"
	}

	var parts []string
	if breaking > 0 {
		parts = append(parts, fmt.Sprintf("%d breaking change(s)", breaking))
	}
	if nonBreaking > 0 {
		parts = append(parts, fmt.Sprintf("%d non-breaking change(s)", nonBreaking))
	}

	return strings.Join(parts, ", ")
}

// joinDiffPath joins path segments with a dot separator.
func joinDiffPath(base, field string) string {
	if base == "" {
		return field
	}
	return base + "." + field
}

// ptrStr returns a pointer to the given string value.
func ptrStr(v string) *string {
	return &v
}

// ptrBool returns a pointer to the given bool value.
func ptrBool(v bool) *bool {
	return &v
}
