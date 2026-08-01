package validation

import (
	"context"
	"fmt"
	"strings"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// ValidateFiles validates multiple files against an ObjectSchema.
// This is the main entry point for validating data before push operations.
func ValidateFiles(
	ctx context.Context,
	files map[string][]byte,
	schema *ObjectSchema,
	config *Config,
) *SchemaValidationResult {
	result := NewValidResult()

	if schema == nil {
		result.AddWarning("No schema provided, skipping validation")
		return result
	}

	// For group schemas, validate each file against its matching child schema
	if schema.Type == irminmodels.ObjectTypeGroup {
		return validateFilesAgainstGroupSchema(ctx, files, schema, config)
	}

	// For single structured schema, validate all files against it
	if schema.Type == irminmodels.ObjectTypeStructured && schema.Schema != nil {
		for fileName, data := range files {
			fileResult := ValidateFile(ctx, fileName, data, schema, config)
			for _, err := range fileResult.Errors {
				result.AddError(err)
			}
			for _, warning := range fileResult.Warnings {
				result.AddWarning(warning)
			}
		}
	}

	return result
}

// validateFilesAgainstGroupSchema validates files against a group schema by matching file names.
// File matching is case-insensitive to handle variations like "users.json" vs "USERS.JSON".
func validateFilesAgainstGroupSchema(
	ctx context.Context,
	files map[string][]byte,
	groupSchema *ObjectSchema,
	config *Config,
) *SchemaValidationResult {
	result := NewValidResult()

	// Build a map of child schemas by lowercase name for case-insensitive lookup
	childSchemas := make(map[string]*ObjectSchema)
	for i := range groupSchema.Children {
		child := &groupSchema.Children[i]
		childSchemas[strings.ToLower(child.Name)] = child
	}

	// Validate each file
	for fileName, data := range files {
		// Find matching schema by file name (case-insensitive)
		lowerFileName := strings.ToLower(fileName)
		childSchema, found := childSchemas[lowerFileName]
		if !found {
			// Try matching without path prefix
			baseName := getBaseName(fileName)
			childSchema, found = childSchemas[strings.ToLower(baseName)]
		}

		if !found {
			result.AddWarning(fmt.Sprintf("No schema found for file '%s', skipping validation", fileName))
			continue
		}

		if childSchema.Type == irminmodels.ObjectTypeStructured && childSchema.Schema != nil {
			fileResult := ValidateFile(ctx, fileName, data, childSchema, config)
			for _, err := range fileResult.Errors {
				result.AddError(err)
			}
			for _, warning := range fileResult.Warnings {
				result.AddWarning(warning)
			}
		}
	}

	return result
}

// ValidateFile validates a single file's data against an ObjectSchema.
// Returns detailed validation results with field paths and suggestions.
func ValidateFile(
	ctx context.Context,
	fileName string,
	data []byte,
	schema *ObjectSchema,
	config *Config,
) *SchemaValidationResult {
	result := NewValidResult()

	// Handle nil schema
	if schema == nil {
		result.AddError(SchemaValidationError{
			Type:      ValidationErrorFormat,
			FieldPath: "",
			Message:   "No schema provided for validation",
			FileName:  &fileName,
		})
		return result
	}

	// Check content type matches
	if schema.ContentType != nil && *schema.ContentType != "" {
		if err := validateContentType(fileName, *schema.ContentType); err != nil {
			result.AddError(SchemaValidationError{
				Type:       ValidationErrorFormat,
				FieldPath:  "",
				Message:    err.Error(),
				FileName:   &fileName,
				Suggestion: ptr("Ensure the file extension matches the expected content type"),
			})
		}
	}

	// Check size constraints
	if schema.Size != nil && len(data) > *schema.Size {
		result.AddError(SchemaValidationError{
			Type:          ValidationErrorConstraint,
			FieldPath:     "",
			Message:       fmt.Sprintf("file size %d exceeds maximum %d bytes", len(data), *schema.Size),
			ExpectedValue: *schema.Size,
			ActualValue:   len(data),
			FileName:      &fileName,
		})
	}

	// For structured types, validate against the JSON schema
	if schema.Type == irminmodels.ObjectTypeStructured && schema.Schema != nil {
		schemaResult := validateStructuredData(ctx, fileName, data, schema.Schema, schema.ContentType, config)
		for _, err := range schemaResult.Errors {
			result.AddError(err)
		}
		for _, warning := range schemaResult.Warnings {
			result.AddWarning(warning)
		}
	}

	return result
}

// validateStructuredData validates structured file data (JSON or other formats).
func validateStructuredData(
	ctx context.Context,
	fileName string,
	data []byte,
	schema *JSONSchema,
	contentType *string,
	config *Config,
) *SchemaValidationResult {
	result := NewValidResult()

	isJSON := isJSONFile(fileName, contentType)
	if isJSON {
		// Validate JSON files using the JSON schema validator
		errors := ValidateJSONAgainstSchema(ctx, fileName, data, schema)
		for _, err := range errors {
			result.AddError(err)
		}
		return result
	}

	// For non-JSON structured files, use DuckDB-based validation if config is provided
	if config != nil && config.Env != nil && config.Logger != nil && config.Ctx != nil {
		errors, warnings := ValidateStructuredFile(
			config.Ctx,
			fileName,
			data,
			schema,
			config.Env,
			config.Logger,
		)
		for _, errMsg := range errors {
			result.AddError(SchemaValidationError{
				Type:      ValidationErrorFormat,
				FieldPath: "",
				Message:   errMsg,
				FileName:  &fileName,
			})
		}
		for _, warning := range warnings {
			result.AddWarning(warning)
		}
		return result
	}

	// Config not provided - skip schema validation with a warning
	result.AddWarning(fmt.Sprintf("Schema validation for non-JSON file '%s' requires DuckDB context", fileName))
	return result
}

// isJSONFile determines if a file is a single-document JSON file (not JSONL/NDJSON).
func isJSONFile(fileName string, contentType *string) bool {
	if contentType != nil {
		contentTypeLower := strings.ToLower(*contentType)
		// Check for standard JSON but exclude JSONL/NDJSON which contain multiple JSON objects
		return strings.Contains(contentTypeLower, "application/json") &&
			!strings.Contains(contentTypeLower, "jsonl") &&
			!strings.Contains(contentTypeLower, "ndjson")
	}

	// Infer from filename if content type not set
	// .json is single-document JSON; .jsonl and .ndjson are newline-delimited
	lowerFileName := strings.ToLower(fileName)
	return strings.HasSuffix(lowerFileName, ".json") &&
		!strings.HasSuffix(lowerFileName, ".jsonl")
}

// validateContentType validates that a file's extension matches the expected content type.
func validateContentType(fileName, expectedType string) error {
	// Infer content type from extension and compare
	lastDot := strings.LastIndex(fileName, ".")
	if lastDot == -1 {
		return nil // No extension, can't validate
	}
	ext := strings.ToLower(fileName[lastDot+1:])
	contentTypes := map[string][]string{
		"json":    {"application/json"},
		"jsonl":   {"application/jsonl", "application/x-ndjson"},
		"ndjson":  {"application/jsonl", "application/x-ndjson"},
		"csv":     {"text/csv", "application/csv"},
		"tsv":     {"text/tab-separated-values"},
		"xml":     {"application/xml", "text/xml"},
		"txt":     {"text/plain"},
		"parquet": {"application/x-parquet", "application/vnd.apache.parquet"},
		"avro":    {"application/vnd.apache.avro", "application/avro"},
		"orc":     {"application/x-orc"},
		"xlsx":    {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
		"xls":     {"application/vnd.ms-excel"},
		"xlsm":    {"application/vnd.ms-excel.sheet.macroEnabled.12"},
		"xlsb":    {"application/vnd.ms-excel.sheet.binary.macroEnabled.12"},
	}
	if allowed, ok := contentTypes[ext]; ok {
		for _, ct := range allowed {
			if strings.Contains(expectedType, ct) {
				return nil
			}
		}
		return fmt.Errorf("content type mismatch: expected %s, file has extension .%s", expectedType, ext)
	}
	return nil // Allow if can't determine
}

// getBaseName extracts the base file name from a path.
func getBaseName(path string) string {
	// Handle both forward and back slashes
	lastSlash := strings.LastIndexAny(path, "/\\")
	if lastSlash >= 0 {
		return path[lastSlash+1:]
	}
	return path
}
