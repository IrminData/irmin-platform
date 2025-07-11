package irminsdkvalidator

import (
	"errors"
	"fmt"
	"reflect"
	"strings"

	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
	"github.com/go-playground/validator/v10"
)

// ValidationResultError contains validation results in multiple formats for different use cases.
type ValidationResultError struct {
	// IsValid indicates whether the validation passed
	IsValid bool

	// UserMessage provides a single, generic error message suitable for end users
	UserMessage string

	// FieldErrors maps field names to user-friendly error messages
	FieldErrors map[string]string

	// RawErrors contains the original validation errors from the underlying library
	RawErrors error
}

// Error implements the error interface for backward compatibility.
func (vr *ValidationResultError) Error() string {
	if vr.IsValid {
		return ""
	}
	if vr.UserMessage != "" {
		return vr.UserMessage
	}
	if vr.RawErrors != nil {
		return vr.RawErrors.Error()
	}
	return "validation failed"
}

// HasErrors returns true if there are any validation errors.
func (vr *ValidationResultError) HasErrors() bool {
	return !vr.IsValid
}

// GetUserMessage returns a single user-friendly error message.
func (vr *ValidationResultError) GetUserMessage() string {
	return vr.UserMessage
}

// GetFieldErrors returns a map of field-specific error messages.
func (vr *ValidationResultError) GetFieldErrors() map[string]string {
	return vr.FieldErrors
}

// GetRawErrors returns the original validation errors.
func (vr *ValidationResultError) GetRawErrors() error {
	return vr.RawErrors
}

// Validator provides validation functionality for Irmin models.
type Validator struct {
	validate    *validator.Validate
	sqidManager *irminsqids.SQIDManager
}

// NewValidator creates a new validator instance.
func NewValidator(sqidManager *irminsqids.SQIDManager) *Validator {
	v := validator.New()

	validator := &Validator{
		validate:    v,
		sqidManager: sqidManager,
	}

	registerValidations(v, validator)
	return validator
}

// NewClientValidator creates a new validator instance for client-side use.
// This validator skips SQID validation since clients don't have access to the SQID alphabet.
func NewClientValidator() *Validator {
	v := validator.New()

	validator := &Validator{
		validate:    v,
		sqidManager: nil, // No SQID manager for client-side validation
	}

	registerValidations(v, validator)
	return validator
}

// registerValidations registers all custom validation functions with the validator.
func registerValidations(v *validator.Validate, validator *Validator) {
	// Register custom validation functions
	if err := v.RegisterValidation("validtoken", validateToken); err != nil {
		panic(err)
	}
	if err := v.RegisterValidation("validslug", validateSlug); err != nil {
		panic(err)
	}
	if err := v.RegisterValidation("validsqid", validator.validateSQID); err != nil {
		panic(err)
	}
	if err := v.RegisterValidation("validrrule", validateRRule); err != nil {
		panic(err)
	}
	if err := v.RegisterValidation("validcron", validateCron); err != nil {
		panic(err)
	}
	if err := v.RegisterValidation("validschedule", validateScheduleTrigger); err != nil {
		panic(err)
	}
	if err := v.RegisterValidation("validsql", validateSQL); err != nil {
		panic(err)
	}
	if err := v.RegisterValidation("validdocumentation", validateDocumentation); err != nil {
		panic(err)
	}
	if err := v.RegisterValidation("validurl", validateURL); err != nil {
		panic(err)
	}
	if err := v.RegisterValidation("validphone", validatePhone); err != nil {
		panic(err)
	}

	// Register custom pipeline stage validation
	if err := v.RegisterValidation("validpipelinestage", validator.validatePipelineStage); err != nil {
		panic(err)
	}

	// Register custom workflowable validation
	if err := v.RegisterValidation("validworkflowable", validator.validateWorkflowable); err != nil {
		panic(err)
	}

	// Register image URL validation
	if err := v.RegisterValidation("validimageurl", validateImageURL); err != nil {
		panic(err)
	}
}

// Validate validates a struct and returns validation errors.
func (v *Validator) Validate(s any) error {
	return v.validate.Struct(s)
}

// ValidateVar validates a single variable.
func (v *Validator) ValidateVar(field any, tag string) error {
	return v.validate.Var(field, tag)
}

// ValidateEnhanced validates a struct and returns a detailed ValidationResultError.
// This provides multiple error formats for different use cases.
func (v *Validator) ValidateEnhanced(s any) *ValidationResultError {
	err := v.validate.Struct(s)
	if err == nil {
		return &ValidationResultError{
			IsValid:     true,
			UserMessage: "",
			FieldErrors: make(map[string]string),
			RawErrors:   nil,
		}
	}

	return v.buildValidationResult(err)
}

// ValidateVarEnhanced validates a single variable and returns a detailed ValidationResultError.
func (v *Validator) ValidateVarEnhanced(field any, tag string) *ValidationResultError {
	err := v.validate.Var(field, tag)
	if err == nil {
		return &ValidationResultError{
			IsValid:     true,
			UserMessage: "",
			FieldErrors: make(map[string]string),
			RawErrors:   nil,
		}
	}

	return v.buildValidationResult(err)
}

// ValidateDynamic validates data that could be either a single struct or an array of structs.
// It dynamically determines the type and applies appropriate validation.
// This is useful for API responses where the data field can contain either a single object or an array.
func (v *Validator) ValidateDynamic(data any) *ValidationResultError {
	if data == nil {
		return &ValidationResultError{
			IsValid:     true,
			UserMessage: "",
			FieldErrors: make(map[string]string),
			RawErrors:   nil,
		}
	}

	// Use reflection to determine the type of data
	dataValue := reflect.ValueOf(data)
	dataType := dataValue.Type()

	// Handle pointers by dereferencing them
	if dataType.Kind() == reflect.Ptr {
		if dataValue.IsNil() {
			return &ValidationResultError{
				IsValid:     true,
				UserMessage: "",
				FieldErrors: make(map[string]string),
				RawErrors:   nil,
			}
		}
		dataValue = dataValue.Elem()
		dataType = dataValue.Type()
	}

	// Check if it's an array or slice
	switch dataType.Kind() {
	case reflect.Slice, reflect.Array:
		// For arrays/slices, validate each element individually (equivalent to "dive" validation)
		return v.validateArray(dataValue)
	default:
		// For single structs, validate directly
		return v.ValidateEnhanced(data)
	}
}

// validateArray validates each element in an array or slice.
// This provides the equivalent functionality of the "dive" validation tag.
func (v *Validator) validateArray(arrayValue reflect.Value) *ValidationResultError {
	length := arrayValue.Len()

	// Track all validation errors
	allFieldErrors := make(map[string]string)
	var allUserMessages []string
	hasErrors := false

	for i := range length {
		element := arrayValue.Index(i).Interface()
		validationResult := v.ValidateEnhanced(element)

		if validationResult.HasErrors() {
			hasErrors = true

			// Add field errors with index prefix
			for field, message := range validationResult.GetFieldErrors() {
				allFieldErrors[fmt.Sprintf("[%d].%s", i, field)] = message
			}

			// Add user message with index
			if validationResult.GetUserMessage() != "" {
				allUserMessages = append(allUserMessages, fmt.Sprintf("Item %d: %s", i, validationResult.GetUserMessage()))
			}
		}
	}

	if !hasErrors {
		return &ValidationResultError{
			IsValid:     true,
			UserMessage: "",
			FieldErrors: make(map[string]string),
			RawErrors:   nil,
		}
	}

	// Combine all error messages
	var userMessage string
	if len(allUserMessages) == 1 {
		userMessage = allUserMessages[0]
	} else if len(allUserMessages) > 1 {
		userMessage = fmt.Sprintf("Multiple validation errors: %v", allUserMessages)
	} else {
		userMessage = "Array validation failed"
	}

	return &ValidationResultError{
		IsValid:     false,
		UserMessage: userMessage,
		FieldErrors: allFieldErrors,
		RawErrors:   fmt.Errorf("array validation failed"),
	}
}

// buildValidationResult converts validation errors into a structured ValidationResultError.
func (v *Validator) buildValidationResult(err error) *ValidationResultError {
	result := &ValidationResultError{
		IsValid:     false,
		FieldErrors: make(map[string]string),
		RawErrors:   err,
	}

	// Check if it's a ValidationErrors type from go-playground/validator
	var validationErrors validator.ValidationErrors
	if errors.As(err, &validationErrors) {
		var userMessages []string

		for _, fieldError := range validationErrors {
			fieldName := v.getFieldName(fieldError)
			fieldMessage := v.getFieldErrorMessage(fieldError)

			result.FieldErrors[fieldName] = fieldMessage
			userMessages = append(userMessages, fmt.Sprintf("%s: %s", fieldName, fieldMessage))
		}

		if len(userMessages) == 1 {
			result.UserMessage = userMessages[0]
		} else {
			result.UserMessage = fmt.Sprintf("Validation failed: %s", strings.Join(userMessages, "; "))
		}
	} else {
		// Not a ValidationErrors, just use the error message
		result.UserMessage = err.Error()
	}

	return result
}

// getFieldName extracts a user-friendly field name from a validation error.
func (v *Validator) getFieldName(fieldError validator.FieldError) string {
	fieldName := fieldError.Field()

	// Convert PascalCase to snake_case for better readability
	result := make([]rune, 0, len(fieldName)+FieldNameConversionBuffer)
	for i, r := range fieldName {
		if i > 0 && 'A' <= r && r <= 'Z' {
			result = append(result, '_')
		}
		result = append(result, r)
	}

	return strings.ToLower(string(result))
}

// getStandardValidationMessage returns a user-friendly message for standard validation tags.
func (v *Validator) getStandardValidationMessage(field, tag, param string) (string, bool) {
	switch tag {
	case "required":
		return fmt.Sprintf("%s is required", field), true
	case "email":
		return fmt.Sprintf("%s must be a valid email address", field), true
	case "min":
		return fmt.Sprintf("%s must be at least %s characters", field, param), true
	case "max":
		return fmt.Sprintf("%s must be at most %s characters", field, param), true
	case "len":
		return fmt.Sprintf("%s must be exactly %s characters", field, param), true
	case "oneof":
		return fmt.Sprintf("%s must be one of: %s", field, param), true
	case "datetime":
		return fmt.Sprintf("%s must be a valid datetime", field), true
	case "dive":
		return fmt.Sprintf("%s contains invalid items", field), true
	default:
		return "", false
	}
}

// getStringValidationMessage returns user-friendly messages for string-specific validations.
func (v *Validator) getStringValidationMessage(field, tag, param string) (string, bool) {
	switch tag {
	case "required_if", "required_with":
		return fmt.Sprintf("%s is required", field), true
	case "excludes":
		return fmt.Sprintf("%s contains invalid characters", field), true
	case "contains":
		return fmt.Sprintf("%s must contain %s", field, param), true
	default:
		return "", false
	}
}

// getCustomValidationMessage returns user-friendly messages for custom validation tags.
func (v *Validator) getCustomValidationMessage(field, tag string) (string, bool) {
	switch tag {
	case "validtoken":
		return fmt.Sprintf("%s must be a valid API token starting with 'cred_'", field), true
	case "validslug":
		return fmt.Sprintf("%s must contain only letters, numbers, underscores, and hyphens", field), true
	case "validsqid":
		return fmt.Sprintf("%s must be a valid identifier", field), true
	case "validrrule":
		return fmt.Sprintf("%s must be a valid recurrence rule", field), true
	case "validcron":
		return fmt.Sprintf("%s must be a valid cron expression", field), true
	case "validschedule":
		return fmt.Sprintf("%s must have valid schedule configuration", field), true
	case "validsql":
		return fmt.Sprintf("%s must be a valid SQL query", field), true
	case "validdocumentation":
		return fmt.Sprintf("%s must be valid documentation content", field), true
	case "validurl":
		return fmt.Sprintf("%s must be a valid URL", field), true
	case "validphone":
		return fmt.Sprintf("%s must be a valid phone number", field), true
	case "validimageurl":
		return fmt.Sprintf("%s must be a valid image URL", field), true
	case "validpipelinestage":
		return fmt.Sprintf("%s must have valid configuration for its type", field), true
	case "validworkflowable":
		return fmt.Sprintf("%s must have valid configuration for its type", field), true
	default:
		return "", false
	}
}

// getFieldErrorMessage generates a user-friendly error message for a field validation error.
func (v *Validator) getFieldErrorMessage(fieldError validator.FieldError) string {
	field := v.getFieldName(fieldError)
	tag := fieldError.Tag()
	param := fieldError.Param()

	// Try custom validation messages first
	if message, ok := v.getCustomValidationMessage(field, tag); ok {
		return message
	}

	// Try standard validation messages
	if message, ok := v.getStandardValidationMessage(field, tag, param); ok {
		return message
	}

	// Try string-specific validation messages
	if message, ok := v.getStringValidationMessage(field, tag, param); ok {
		return message
	}

	// Fallback to generic message
	return fmt.Sprintf("%s failed validation: %s", field, tag)
}
