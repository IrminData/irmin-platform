package lib

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"irmin-api/utils"
	"log/slog"
	"math"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

const (
	jsonSchemaTypeObject = "object"
	jsonSchemaTypeArray  = "array"
)

// ValidationConfig holds optional configuration for schema validation.
type ValidationConfig struct {
	Ctx    context.Context
	Env    *utils.CoreAPIEnv
	Logger *slog.Logger
}

type ValidationResult struct {
	Valid    bool
	Errors   []string
	Warnings []string
}

// ValidateDataAgainstSchema validates data bytes against an ObjectSchema.
// This is a simplified version that skips DuckDB-based validation for non-JSON files.
// For full validation including non-JSON structured files, use ValidateDataAgainstSchemaWithConfig.
func ValidateDataAgainstSchema(fileName string, data []byte, schema *irminmodels.ObjectSchema) ValidationResult {
	return ValidateDataAgainstSchemaWithConfig(fileName, data, schema, nil)
}

// ValidateDataAgainstSchemaWithConfig validates data bytes against an ObjectSchema with optional configuration.
// When config is provided with Env and Logger, it enables DuckDB-based schema validation for non-JSON
// structured files (CSV, Parquet, Excel, etc.).
func ValidateDataAgainstSchemaWithConfig(
	fileName string,
	data []byte,
	schema *irminmodels.ObjectSchema,
	config *ValidationConfig,
) ValidationResult {
	result := ValidationResult{Valid: true, Errors: []string{}, Warnings: []string{}}

	// Handle nil schema - validation cannot proceed without a schema
	if schema == nil {
		result.Errors = append(result.Errors, "No schema provided for validation")
		result.Valid = false
		return result
	}

	// Check content type matches
	if schema.ContentType != nil && *schema.ContentType != "" {
		if err := validateContentType(fileName, *schema.ContentType); err != nil {
			result.Errors = append(result.Errors, err.Error())
			result.Valid = false
		}
	}

	// Check size constraints
	if schema.Size != nil {
		if len(data) > *schema.Size {
			result.Errors = append(result.Errors, fmt.Sprintf("file size %d exceeds max %d", len(data), *schema.Size))
			result.Valid = false
		}
	}

	// For structured types, validate schema
	if schema.Type == irminmodels.ObjectTypeStructured && schema.Schema != nil {
		if err := validateStructuredSchema(fileName, data, schema.Schema, schema.ContentType, config, &result); err != nil {
			result.Errors = append(result.Errors, err.Error())
			result.Valid = false
		}
	}

	return result
}

// validateStructuredSchema validates structured file schemas (JSON or non-JSON).
func validateStructuredSchema(
	fileName string,
	data []byte,
	schema *irminmodels.JSONSchema,
	contentType *string,
	config *ValidationConfig,
	result *ValidationResult,
) error {
	isJSON := determineIfJSONFile(fileName, contentType)
	if isJSON {
		// Validate JSON files using the JSON schema validator
		return validateJSONSchema(data, schema)
	}

	// For non-JSON structured files, use DuckDB-based validation if config is provided
	if config != nil && config.Env != nil && config.Logger != nil && config.Ctx != nil {
		schemaErrors, schemaWarnings := ValidateStructuredFileSchema(
			config.Ctx,
			fileName,
			data,
			schema,
			config.Env,
			config.Logger,
		)
		result.Errors = append(result.Errors, schemaErrors...)
		result.Warnings = append(result.Warnings, schemaWarnings...)
		if len(schemaErrors) > 0 {
			return errors.New("schema validation failed")
		}
		return nil
	}

	// Config not provided - skip schema validation with a warning
	result.Warnings = append(result.Warnings,
		fmt.Sprintf("Schema validation for non-JSON file '%s' requires DuckDB context", fileName))
	return nil
}

// determineIfJSONFile determines if a file is a single-document JSON file (not JSONL/NDJSON).
func determineIfJSONFile(fileName string, contentType *string) bool {
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

func validateJSONSchema(data []byte, schema *irminmodels.JSONSchema) error {
	// Parse JSON
	var parsed any
	if err := json.Unmarshal(data, &parsed); err != nil {
		return fmt.Errorf("invalid JSON: %w", err)
	}

	// Type validation
	return validateJSONType(parsed, schema)
}

//nolint:gocognit // Nothing complex here
func validateJSONType(value any, schema *irminmodels.JSONSchema) error {
	// Validate type matches
	switch schema.Type {
	case jsonSchemaTypeObject:
		obj, ok := value.(map[string]any)
		if !ok {
			return fmt.Errorf("expected object, got %T", value)
		}
		// Validate required fields
		for _, req := range schema.Required {
			if _, exists := obj[req]; !exists {
				return fmt.Errorf("missing required field: %s", req)
			}
		}
		// Validate properties
		for name, propSchema := range schema.Properties {
			if propValue, exists := obj[name]; exists {
				if err := validateJSONType(propValue, &propSchema); err != nil {
					return fmt.Errorf("field %s: %w", name, err)
				}
			}
		}
	case jsonSchemaTypeArray:
		arr, ok := value.([]any)
		if !ok {
			return fmt.Errorf("expected array, got %T", value)
		}
		if schema.Items != nil {
			for i, item := range arr {
				if err := validateJSONType(item, schema.Items); err != nil {
					return fmt.Errorf("item[%d]: %w", i, err)
				}
			}
		}
	case "string":
		if _, ok := value.(string); !ok {
			return fmt.Errorf("expected string, got %T", value)
		}
	case "number":
		if _, ok := value.(float64); !ok {
			return fmt.Errorf("expected number, got %T", value)
		}
	case "integer":
		num, ok := value.(float64)
		if !ok {
			return fmt.Errorf("expected integer, got %T", value)
		}
		// Check if the float64 value is actually an integer (no fractional part)
		if num != math.Trunc(num) {
			return fmt.Errorf("expected integer, got float with fractional part: %v", num)
		}
	case "boolean":
		if _, ok := value.(bool); !ok {
			return fmt.Errorf("expected boolean, got %T", value)
		}
	case "null":
		if value != nil {
			return fmt.Errorf("expected null, got %T", value)
		}
	default:
		// Defensive handling: reject unexpected schema types
		return fmt.Errorf("unsupported schema type: %s", schema.Type)
	}
	return nil
}
