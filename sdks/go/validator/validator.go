package irminsdkvalidator

import (
	"reflect"
	"strings"
	"time"

	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
	"github.com/go-playground/validator/v10"
	"github.com/robfig/cron/v3"
	"github.com/teambition/rrule-go"
)

// Validator provides validation functionality for Irmin models.
type Validator struct {
	validate    *validator.Validate
	sqidManager *irminsqids.SQIDManager
}

// Constants.
const (
	TokenPrefix   = "cred_"
	TokenLength   = 64
	SlugMinLength = 1
	SlugMaxLength = 100
)

// NewValidator creates a new validator instance.
func NewValidator(sqidManager *irminsqids.SQIDManager) *Validator {
	v := validator.New()

	validator := &Validator{
		validate:    v,
		sqidManager: sqidManager,
	}

	// Register custom validation functions
	err := v.RegisterValidation("validtoken", validateToken)
	if err != nil {
		panic(err)
	}
	err = v.RegisterValidation("validslug", validateSlug)
	if err != nil {
		panic(err)
	}
	err = v.RegisterValidation("validsqid", validator.validateSQID)
	if err != nil {
		panic(err)
	}
	err = v.RegisterValidation("validrrule", validateRRule)
	if err != nil {
		panic(err)
	}
	err = v.RegisterValidation("validcron", validateCron)
	if err != nil {
		panic(err)
	}
	err = v.RegisterValidation("validschedule", validateScheduleTrigger)
	if err != nil {
		panic(err)
	}

	// // Use JSON field names in error messages
	// v.RegisterTagNameFunc(func(fld reflect.StructField) string {
	// 	name := strings.SplitN(fld.Tag.Get("json"), ",", 2)[0]
	// 	if name == "-" {
	// 		return ""
	// 	}
	// 	return name
	// })

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

	// Register custom validation functions (excluding SQID validation)
	err := v.RegisterValidation("validtoken", validateToken)
	if err != nil {
		panic(err)
	}
	err = v.RegisterValidation("validslug", validateSlug)
	if err != nil {
		panic(err)
	}
	// Register SQID validation but it will be skipped when sqidManager is nil
	err = v.RegisterValidation("validsqid", validator.validateSQID)
	if err != nil {
		panic(err)
	}
	err = v.RegisterValidation("validrrule", validateRRule)
	if err != nil {
		panic(err)
	}
	err = v.RegisterValidation("validcron", validateCron)
	if err != nil {
		panic(err)
	}
	err = v.RegisterValidation("validschedule", validateScheduleTrigger)
	if err != nil {
		panic(err)
	}

	return validator
}

// validateTokenPrefix is a custom validation function for API token prefixes
// Token prefixes must:
// - Start with "cred_"
// - Be at least 64 characters total
// - Contain only alphanumeric characters and underscores after the prefix.
func validateToken(fl validator.FieldLevel) bool {
	token := fl.Field().String()

	// Must start with "cred_"
	if !strings.HasPrefix(token, TokenPrefix) {
		return false
	}

	// Must be at least 64 characters (this is also checked by min=64)
	if len(token) < TokenLength {
		return false
	}

	// Check that the rest of the token contains only alphanumeric and underscores
	suffix := token[len(TokenPrefix):]
	for _, char := range suffix {
		isAlphaNumeric := (char >= 'a' && char <= 'z') ||
			(char >= 'A' && char <= 'Z') ||
			(char >= '0' && char <= '9')
		isUnderscore := char == '_'

		if !isAlphaNumeric && !isUnderscore {
			return false
		}
	}

	return true
}

func validateRRule(fl validator.FieldLevel) bool {
	field := fl.Field()

	// Handle nil pointers
	if field.Kind() == reflect.Ptr && field.IsNil() {
		return true
	}

	// Get the actual string value
	var rruleValue string
	if field.Kind() == reflect.Ptr {
		rruleValue = field.Elem().String()
	} else {
		rruleValue = field.String()
	}

	// Empty string is considered valid (optional field)
	if rruleValue == "" {
		return true
	}

	// Prepare the RRule string following the same logic as orchestrator
	ruleStr := rruleValue
	ruleStr = strings.TrimPrefix(ruleStr, "RRULE:")
	ruleStr = strings.TrimSpace(ruleStr)
	ruleStr = strings.TrimSuffix(ruleStr, ";")

	// If the RRule string doesn't contain DTSTART, add it
	if !strings.Contains(ruleStr, "DTSTART") {
		// Format with newlines between components
		now := time.Now()
		ruleStr = "DTSTART:" + now.UTC().Format("20060102T150405Z") + "\n" + ruleStr
	} else {
		// Replace semicolons with newlines for existing DTSTART
		ruleStr = strings.ReplaceAll(ruleStr, ";", "\n")
	}

	// Try to parse the RRule string
	_, err := rrule.StrToRRule(ruleStr)
	return err == nil
}

func validateCron(fl validator.FieldLevel) bool {
	field := fl.Field()

	// Handle nil pointers
	if field.Kind() == reflect.Ptr && field.IsNil() {
		return true
	}

	// Get the actual string value
	var cronValue string
	if field.Kind() == reflect.Ptr {
		cronValue = field.Elem().String()
	} else {
		cronValue = field.String()
	}

	// Empty string is considered valid (optional field)
	if cronValue == "" {
		return true
	}

	// Prepare the cron expression following the same logic as orchestrator
	cronStr := cronValue
	cronStr = strings.TrimPrefix(cronStr, "CRON:")
	cronStr = strings.TrimSpace(cronStr)

	// Try to parse the cron expression
	_, err := cron.ParseStandard(cronStr)
	return err == nil
}

// validateBranchName is a custom validation function for branch names
// Branch names must:
// - Be at least 1 character
// - Be at most 100 characters
// - Contain only alphanumeric characters, underscores and hyphens.
func validateSlug(fl validator.FieldLevel) bool {
	field := fl.Field()

	// Handle nil pointers
	if field.Kind() == reflect.Ptr && field.IsNil() {
		return true
	}

	// Get the actual string value
	var branchName string
	if field.Kind() == reflect.Ptr {
		branchName = field.Elem().String()
	} else {
		branchName = field.String()
	}

	// Must be at least 1 character
	if len(branchName) < SlugMinLength {
		return false
	}

	// Must be at most 100 characters
	if len(branchName) > SlugMaxLength {
		return false
	}

	// Check that the branch name contains only alphanumeric characters and underscores
	for _, char := range branchName {
		isAlphaNumeric := (char >= 'a' && char <= 'z') ||
			(char >= 'A' && char <= 'Z') ||
			(char >= '0' && char <= '9')
		isUnderscore := char == '_'
		isHyphen := char == '-'

		if !isAlphaNumeric && !isUnderscore && !isHyphen {
			return false
		}
	}

	return true
}

func (v *Validator) validateSQID(fl validator.FieldLevel) bool {
	// Skip SQID validation if no SQID manager is available (client-side scenario)
	if v.sqidManager == nil {
		return true
	}

	// Get the value of the field
	field := fl.Field()

	// Handle nil pointers
	if field.Kind() == reflect.Ptr && field.IsNil() {
		return true
	}

	// Get the actual string value
	var sqidValue string
	if field.Kind() == reflect.Ptr {
		sqidValue = field.Elem().String()
	} else {
		sqidValue = field.String()
	}

	typeParam := fl.Param()

	// Get the type of the sqid
	typeParam = strings.TrimSpace(typeParam)

	// Get the sqid manager
	sqidManager := v.sqidManager

	// Decode the sqid
	decoded, err := sqidManager.Decode(typeParam, sqidValue)
	if err != nil {
		return false
	}

	// Check if the decoded value is a valid uint64
	if decoded == 0 {
		return false
	}

	return true
}

func validateScheduleTrigger(fl validator.FieldLevel) bool {
	// Get the parent struct (ScheduleTrigger) from the Type field
	parentStruct := fl.Parent()

	// Make sure we're working with a struct
	if parentStruct.Kind() != reflect.Struct {
		return true // Let other validators handle non-struct cases
	}

	// Get the Type field value (this is the current field being validated)
	triggerType := fl.Field().String()

	// Only validate time triggers with this function
	if triggerType != "time" {
		return true
	}

	return validateTimeTrigger(parentStruct)
}

// validateTimeTrigger validates that time triggers have proper RRule or Cron configuration.
func validateTimeTrigger(parentStruct reflect.Value) bool {
	rruleField := parentStruct.FieldByName("RRule")
	cronField := parentStruct.FieldByName("Cron")

	rruleIsEmpty := isFieldEmpty(rruleField)
	cronIsEmpty := isFieldEmpty(cronField)

	// At least one must be provided
	if rruleIsEmpty && cronIsEmpty {
		return false
	}

	// Validate RRule if present
	if !rruleIsEmpty {
		rruleValue := rruleField.Elem().String()
		if !isValidRRule(rruleValue) {
			return false
		}
	}

	// Validate Cron if present
	if !cronIsEmpty {
		cronValue := cronField.Elem().String()
		if !isValidCron(cronValue) {
			return false
		}
	}

	return true
}

// isFieldEmpty checks if a pointer field is nil or contains an empty string.
func isFieldEmpty(field reflect.Value) bool {
	return !field.IsValid() || field.IsNil() ||
		(field.Elem().IsValid() && field.Elem().String() == "")
}

// Helper function to validate RRule.
func isValidRRule(rruleValue string) bool {
	if rruleValue == "" {
		return true
	}

	// Prepare the RRule string following the same logic as orchestrator
	ruleStr := rruleValue
	ruleStr = strings.TrimPrefix(ruleStr, "RRULE:")
	ruleStr = strings.TrimSpace(ruleStr)
	ruleStr = strings.TrimSuffix(ruleStr, ";")

	// If the RRule string doesn't contain DTSTART, add it
	if !strings.Contains(ruleStr, "DTSTART") {
		// Format with newlines between components
		now := time.Now()
		ruleStr = "DTSTART:" + now.UTC().Format("20060102T150405Z") + "\n" + ruleStr
	} else {
		// Replace semicolons with newlines for existing DTSTART
		ruleStr = strings.ReplaceAll(ruleStr, ";", "\n")
	}

	// Try to parse the RRule string
	_, err := rrule.StrToRRule(ruleStr)
	return err == nil
}

// Helper function to validate Cron.
func isValidCron(cronValue string) bool {
	if cronValue == "" {
		return true
	}

	// Prepare the cron expression following the same logic as orchestrator
	cronStr := cronValue
	cronStr = strings.TrimPrefix(cronStr, "CRON:")
	cronStr = strings.TrimSpace(cronStr)

	// Try to parse the cron expression
	_, err := cron.ParseStandard(cronStr)
	return err == nil
}

// Validate validates a struct and returns validation errors.
func (v *Validator) Validate(s any) error {
	return v.validate.Struct(s)
}

// ValidateVar validates a single variable.
func (v *Validator) ValidateVar(field any, tag string) error {
	return v.validate.Var(field, tag)
}
