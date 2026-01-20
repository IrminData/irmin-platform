package validation

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
)

const (
	jsonSchemaTypeObject  = "object"
	jsonSchemaTypeArray   = "array"
	jsonSchemaTypeString  = "string"
	jsonSchemaTypeNumber  = "number"
	jsonSchemaTypeInteger = "integer"
	jsonSchemaTypeBoolean = "boolean"
	jsonSchemaTypeNull    = "null"
)

// ValidateJSONAgainstSchema validates JSON data against a JSON schema.
// Returns detailed validation errors with field paths and suggestions.
func ValidateJSONAgainstSchema(
	_ context.Context,
	fileName string,
	data []byte,
	schema *JSONSchema,
) []SchemaValidationError {
	var errors []SchemaValidationError

	if schema == nil {
		return errors
	}

	// Parse the JSON data
	var parsed any
	if err := json.Unmarshal(data, &parsed); err != nil {
		errors = append(errors, SchemaValidationError{
			Type:      ValidationErrorFormat,
			FieldPath: "",
			Message:   fmt.Sprintf("Invalid JSON: %v", err),
			FileName:  &fileName,
		})
		return errors
	}

	// Validate recursively
	validateValue(parsed, schema, "", fileName, &errors)
	return errors
}

// validateValue recursively validates a value against a JSON schema.
func validateValue(
	value any,
	schema *JSONSchema,
	path string,
	fileName string,
	errors *[]SchemaValidationError,
) {
	if schema == nil {
		return
	}

	// Handle null values
	if value == nil {
		if schema.Type != jsonSchemaTypeNull {
			*errors = append(*errors, SchemaValidationError{
				Type:         ValidationErrorNullValue,
				FieldPath:    path,
				Message:      fmt.Sprintf("expected %s, got null", schema.Type),
				ExpectedType: &schema.Type,
				FileName:     &fileName,
				Suggestion:   ptr("Provide a non-null value"),
			})
		}
		return
	}

	// Type validation
	switch schema.Type {
	case jsonSchemaTypeObject:
		validateObject(value, schema, path, fileName, errors)
	case jsonSchemaTypeArray:
		validateArray(value, schema, path, fileName, errors)
	case jsonSchemaTypeString:
		validateString(value, schema, path, fileName, errors)
	case jsonSchemaTypeNumber:
		validateNumber(value, schema, path, fileName, errors)
	case jsonSchemaTypeInteger:
		validateInteger(value, schema, path, fileName, errors)
	case jsonSchemaTypeBoolean:
		validateBoolean(value, path, fileName, errors)
	case jsonSchemaTypeNull:
		// Already handled above - if we get here, value is not null but schema expects null
		actualType := getTypeName(value)
		*errors = append(*errors, SchemaValidationError{
			Type:         ValidationErrorTypeMismatch,
			FieldPath:    path,
			Message:      fmt.Sprintf("expected null, got %s", actualType),
			ExpectedType: ptr(jsonSchemaTypeNull),
			ActualType:   &actualType,
			FileName:     &fileName,
		})
	}
}

// validateObject validates an object value against an object schema.
func validateObject(
	value any,
	schema *JSONSchema,
	path string,
	fileName string,
	errors *[]SchemaValidationError,
) {
	obj, ok := value.(map[string]any)
	if !ok {
		actualType := getTypeName(value)
		*errors = append(*errors, SchemaValidationError{
			Type:         ValidationErrorTypeMismatch,
			FieldPath:    path,
			Message:      fmt.Sprintf("expected object, got %s", actualType),
			ExpectedType: ptr("object"),
			ActualType:   &actualType,
			FileName:     &fileName,
			Suggestion:   ptr("Ensure the value is a JSON object {}"),
		})
		return
	}

	// Check required fields
	for _, requiredField := range schema.Required {
		if _, exists := obj[requiredField]; !exists {
			fieldPath := joinValidationPath(path, requiredField)
			*errors = append(*errors, SchemaValidationError{
				Type:       ValidationErrorMissingField,
				FieldPath:  fieldPath,
				Message:    fmt.Sprintf("required field '%s' is missing", requiredField),
				FileName:   &fileName,
				Suggestion: ptr(fmt.Sprintf("Add the '%s' field to the object", requiredField)),
			})
		}
	}

	// Validate each property
	for propName, propSchema := range schema.Properties {
		if propValue, exists := obj[propName]; exists {
			fieldPath := joinValidationPath(path, propName)
			propSchemaCopy := propSchema // Create a copy to get a pointer
			validateValue(propValue, &propSchemaCopy, fieldPath, fileName, errors)
		}
	}
}

// validateArray validates an array value against an array schema.
func validateArray(
	value any,
	schema *JSONSchema,
	path string,
	fileName string,
	errors *[]SchemaValidationError,
) {
	arr, ok := value.([]any)
	if !ok {
		actualType := getTypeName(value)
		*errors = append(*errors, SchemaValidationError{
			Type:         ValidationErrorTypeMismatch,
			FieldPath:    path,
			Message:      fmt.Sprintf("expected array, got %s", actualType),
			ExpectedType: ptr("array"),
			ActualType:   &actualType,
			FileName:     &fileName,
			Suggestion:   ptr("Ensure the value is a JSON array []"),
		})
		return
	}

	// Check array constraints
	if schema.MinItems != nil && len(arr) < *schema.MinItems {
		*errors = append(*errors, SchemaValidationError{
			Type:          ValidationErrorConstraint,
			FieldPath:     path,
			Message:       fmt.Sprintf("array has %d items, minimum is %d", len(arr), *schema.MinItems),
			ExpectedValue: *schema.MinItems,
			ActualValue:   len(arr),
			FileName:      &fileName,
		})
	}

	if schema.MaxItems != nil && len(arr) > *schema.MaxItems {
		*errors = append(*errors, SchemaValidationError{
			Type:          ValidationErrorConstraint,
			FieldPath:     path,
			Message:       fmt.Sprintf("array has %d items, maximum is %d", len(arr), *schema.MaxItems),
			ExpectedValue: *schema.MaxItems,
			ActualValue:   len(arr),
			FileName:      &fileName,
		})
	}

	// Validate array items
	if schema.Items != nil {
		for i, item := range arr {
			itemPath := fmt.Sprintf("%s[%d]", path, i)
			rowIndex := i
			validateValueWithRowIndex(item, schema.Items, itemPath, fileName, &rowIndex, errors)
		}
	}
}

// validateValueWithRowIndex validates a value with row index tracking.
func validateValueWithRowIndex(
	value any,
	schema *JSONSchema,
	path string,
	fileName string,
	rowIndex *int,
	errors *[]SchemaValidationError,
) {
	startLen := len(*errors)
	validateValue(value, schema, path, fileName, errors)

	// Add row index to any new errors
	for i := startLen; i < len(*errors); i++ {
		(*errors)[i].RowIndex = rowIndex
	}
}

// validateString validates a string value against a string schema.
func validateString(
	value any,
	schema *JSONSchema,
	path string,
	fileName string,
	errors *[]SchemaValidationError,
) {
	str, ok := value.(string)
	if !ok {
		actualType := getTypeName(value)
		*errors = append(*errors, SchemaValidationError{
			Type:         ValidationErrorTypeMismatch,
			FieldPath:    path,
			Message:      fmt.Sprintf("expected %s, got %s", jsonSchemaTypeString, actualType),
			ExpectedType: ptr(jsonSchemaTypeString),
			ActualType:   &actualType,
			FileName:     &fileName,
			Suggestion:   ptr("Convert the value to a string"),
		})
		return
	}

	// Check string constraints
	if schema.MinLength != nil && len(str) < *schema.MinLength {
		*errors = append(*errors, SchemaValidationError{
			Type:          ValidationErrorConstraint,
			FieldPath:     path,
			Message:       fmt.Sprintf("string length is %d, minimum is %d", len(str), *schema.MinLength),
			ExpectedValue: *schema.MinLength,
			ActualValue:   len(str),
			FileName:      &fileName,
		})
	}

	if schema.MaxLength != nil && len(str) > *schema.MaxLength {
		*errors = append(*errors, SchemaValidationError{
			Type:          ValidationErrorConstraint,
			FieldPath:     path,
			Message:       fmt.Sprintf("string length is %d, maximum is %d", len(str), *schema.MaxLength),
			ExpectedValue: *schema.MaxLength,
			ActualValue:   len(str),
			FileName:      &fileName,
		})
	}

	// Check enum values
	if len(schema.Enum) > 0 {
		found := false
		for _, enumVal := range schema.Enum {
			if enumStr, isEnumStr := enumVal.(string); isEnumStr && enumStr == str {
				found = true
				break
			}
		}
		if !found {
			*errors = append(*errors, SchemaValidationError{
				Type:          ValidationErrorEnumValue,
				FieldPath:     path,
				Message:       fmt.Sprintf("value '%s' is not in allowed values", str),
				ExpectedValue: schema.Enum,
				ActualValue:   str,
				FileName:      &fileName,
				Suggestion:    ptr(fmt.Sprintf("Use one of: %v", schema.Enum)),
			})
		}
	}
}

// validateNumber validates a number value against a number schema.
func validateNumber(
	value any,
	schema *JSONSchema,
	path string,
	fileName string,
	errors *[]SchemaValidationError,
) {
	num, ok := value.(float64)
	if !ok {
		actualType := getTypeName(value)
		*errors = append(*errors, SchemaValidationError{
			Type:         ValidationErrorTypeMismatch,
			FieldPath:    path,
			Message:      fmt.Sprintf("expected %s, got %s", jsonSchemaTypeNumber, actualType),
			ExpectedType: ptr(jsonSchemaTypeNumber),
			ActualType:   &actualType,
			FileName:     &fileName,
			Suggestion:   ptr("Convert the value to a number"),
		})
		return
	}

	// Check number constraints
	if schema.Minimum != nil && num < *schema.Minimum {
		*errors = append(*errors, SchemaValidationError{
			Type:          ValidationErrorConstraint,
			FieldPath:     path,
			Message:       fmt.Sprintf("value %v is less than minimum %v", num, *schema.Minimum),
			ExpectedValue: *schema.Minimum,
			ActualValue:   num,
			FileName:      &fileName,
		})
	}

	if schema.Maximum != nil && num > *schema.Maximum {
		*errors = append(*errors, SchemaValidationError{
			Type:          ValidationErrorConstraint,
			FieldPath:     path,
			Message:       fmt.Sprintf("value %v is greater than maximum %v", num, *schema.Maximum),
			ExpectedValue: *schema.Maximum,
			ActualValue:   num,
			FileName:      &fileName,
		})
	}
}

// validateInteger validates an integer value against an integer schema.
func validateInteger(
	value any,
	schema *JSONSchema,
	path string,
	fileName string,
	errors *[]SchemaValidationError,
) {
	num, ok := value.(float64)
	if !ok {
		actualType := getTypeName(value)
		*errors = append(*errors, SchemaValidationError{
			Type:         ValidationErrorTypeMismatch,
			FieldPath:    path,
			Message:      fmt.Sprintf("expected %s, got %s", jsonSchemaTypeInteger, actualType),
			ExpectedType: ptr(jsonSchemaTypeInteger),
			ActualType:   &actualType,
			FileName:     &fileName,
			Suggestion:   ptr("Convert the value to an integer"),
		})
		return
	}

	// Check if it's actually an integer
	floatType := "float"
	if num != math.Trunc(num) {
		*errors = append(*errors, SchemaValidationError{
			Type:         ValidationErrorTypeMismatch,
			FieldPath:    path,
			Message:      fmt.Sprintf("expected %s, got float %v", jsonSchemaTypeInteger, num),
			ExpectedType: ptr(jsonSchemaTypeInteger),
			ActualType:   &floatType,
			ActualValue:  num,
			FileName:     &fileName,
			Suggestion:   ptr("Remove decimal places from the value"),
		})
		return
	}

	// Check constraints using the number validator
	validateNumber(value, schema, path, fileName, errors)
}

// validateBoolean validates a boolean value.
func validateBoolean(
	value any,
	path string,
	fileName string,
	errors *[]SchemaValidationError,
) {
	if _, ok := value.(bool); !ok {
		actualType := getTypeName(value)
		*errors = append(*errors, SchemaValidationError{
			Type:         ValidationErrorTypeMismatch,
			FieldPath:    path,
			Message:      fmt.Sprintf("expected %s, got %s", jsonSchemaTypeBoolean, actualType),
			ExpectedType: ptr(jsonSchemaTypeBoolean),
			ActualType:   &actualType,
			FileName:     &fileName,
			Suggestion:   ptr("Convert the value to true or false"),
		})
	}
}

// GenerateValidationSuggestion creates a helpful suggestion for a validation error.
func GenerateValidationSuggestion(err SchemaValidationError) string {
	if err.Suggestion != nil {
		return *err.Suggestion
	}

	switch err.Type {
	case ValidationErrorMissingField:
		return fmt.Sprintf("Add the missing field '%s' to your data", err.FieldPath)
	case ValidationErrorTypeMismatch:
		if err.ExpectedType != nil {
			return fmt.Sprintf("Convert the value to type '%s'", *err.ExpectedType)
		}
	case ValidationErrorConstraint:
		return "Adjust the value to meet the constraint requirements"
	case ValidationErrorFormat:
		return "Fix the data format to be valid JSON"
	case ValidationErrorEnumValue:
		if err.ExpectedValue != nil {
			return fmt.Sprintf("Use one of the allowed values: %v", err.ExpectedValue)
		}
	case ValidationErrorExtraField:
		return fmt.Sprintf("Remove the unexpected field '%s' from your data", err.FieldPath)
	case ValidationErrorNullValue:
		return "Provide a non-null value for this field"
	case ValidationErrorArrayItems:
		return "Ensure all array items conform to the expected schema"
	}

	return "Review and correct the data"
}

// getTypeName returns a human-readable type name for a value.
func getTypeName(value any) string {
	if value == nil {
		return jsonSchemaTypeNull
	}
	switch value.(type) {
	case bool:
		return jsonSchemaTypeBoolean
	case float64:
		return jsonSchemaTypeNumber
	case string:
		return jsonSchemaTypeString
	case []any:
		return jsonSchemaTypeArray
	case map[string]any:
		return jsonSchemaTypeObject
	default:
		return fmt.Sprintf("%T", value)
	}
}

// joinValidationPath joins path segments for validation error paths.
func joinValidationPath(base, field string) string {
	if base == "" {
		return field
	}
	return base + "." + field
}
