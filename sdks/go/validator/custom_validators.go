package irminsdkvalidator

import (
	"net/url"
	"reflect"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/robfig/cron/v3"
	"github.com/teambition/rrule-go"
)

// validateToken validates API token format.
// Token can be nil, in which case it is considered valid.
// Token prefixes must:
// - Start with "cred_"
// - Be at least 64 characters total
// - Contain only alphanumeric characters and underscores after the prefix.
func validateToken(fl validator.FieldLevel) bool {
	field := fl.Field()

	// Handle nil pointers
	if field.Kind() == reflect.Ptr && field.IsNil() {
		return true
	}

	// Get the actual string value
	var token string
	if field.Kind() == reflect.Ptr {
		token = field.Elem().String()
	} else {
		token = field.String()
	}

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

// validateSlug validates slug/branch name format.
// Slug can be nil, in which case it is considered valid.
// Slug names must:
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
	var slugName string
	if field.Kind() == reflect.Ptr {
		slugName = field.Elem().String()
	} else {
		slugName = field.String()
	}

	// Must be at least 1 character
	if len(slugName) < SlugMinLength {
		return false
	}

	// Must be at most 100 characters
	if len(slugName) > SlugMaxLength {
		return false
	}

	// Check that the slug contains only alphanumeric characters, underscores, and hyphens
	for _, char := range slugName {
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

// validateRRule validates RRule recurrence rule format.
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

	return isValidRRule(rruleValue)
}

// validateCron validates cron expression format.
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

	return isValidCron(cronValue)
}

// validateSQL validates SQL queries to ensure they are safe and properly formatted.
func validateSQL(fl validator.FieldLevel) bool {
	field := fl.Field()

	// Handle nil pointers
	if field.Kind() == reflect.Ptr && field.IsNil() {
		return true
	}

	// Get the actual string value
	var sqlValue string
	if field.Kind() == reflect.Ptr {
		sqlValue = field.Elem().String()
	} else {
		sqlValue = field.String()
	}

	// Empty string is considered valid (optional field)
	if sqlValue == "" {
		return true
	}

	// Check maximum length
	if len(sqlValue) > SQLMaxLength {
		return false
	}

	// Basic SQL injection prevention - check for dangerous patterns
	sqlLower := strings.ToLower(strings.TrimSpace(sqlValue))

	// Block only dangerous DDL and system operations
	dangerousPatterns := []string{
		"drop ", "truncate ", "alter ",
		"exec ", "execute ", "sp_", "xp_",
		"/*!",
	}

	for _, pattern := range dangerousPatterns {
		if strings.Contains(sqlLower, pattern) {
			return false
		}
	}

	return true
}

// validateDocumentation validates documentation fields to ensure they contain valid markdown
// while being quite permissive. Prevents injection attacks through documentation.
func validateDocumentation(fl validator.FieldLevel) bool {
	field := fl.Field()

	// Handle nil pointers
	if field.Kind() == reflect.Ptr && field.IsNil() {
		return true
	}

	// Get the actual string value
	var docValue string
	if field.Kind() == reflect.Ptr {
		docValue = field.Elem().String()
	} else {
		docValue = field.String()
	}

	// Empty string is considered valid (optional field)
	if docValue == "" {
		return true
	}

	// Check maximum length
	if len(docValue) > DocumentationMaxLength {
		return false
	}

	// Block script tags and other potentially dangerous content
	docLower := strings.ToLower(docValue)
	dangerousPatterns := []string{
		"<script", "</script>", "javascript:", "vbscript:", "onload=", "onerror=",
		"onclick=", "onmouseover=", "onfocus=", "<iframe", "</iframe>",
		"<object", "</object>", "<embed", "</embed>", "<form", "</form>",
	}

	for _, pattern := range dangerousPatterns {
		if strings.Contains(docLower, pattern) {
			return false
		}
	}

	// Basic markdown structure validation - be permissive but check for balanced brackets
	// Count square brackets for links [text](url) and images ![alt](url)
	openSquare := strings.Count(docValue, "[")
	closeSquare := strings.Count(docValue, "]")
	openParen := strings.Count(docValue, "(")
	closeParen := strings.Count(docValue, ")")

	// Allow substantial tolerance for unbalanced brackets (markdown can be flexible)
	// Only fail if extremely unbalanced (indicating potential malformed content)
	if openSquare > 0 && closeSquare > 0 {
		bracketDiff := openSquare - closeSquare
		if bracketDiff > 20 || bracketDiff < -20 {
			return false
		}
	}

	if openParen > 0 && closeParen > 0 {
		parenDiff := openParen - closeParen
		if parenDiff > 20 || parenDiff < -20 {
			return false
		}
	}

	return true
}

// validateURL validates URL format.
func validateURL(fl validator.FieldLevel) bool {
	field := fl.Field()

	// Handle nil pointers
	if field.Kind() == reflect.Ptr && field.IsNil() {
		return true
	}

	// Get the actual string value
	var urlValue string
	if field.Kind() == reflect.Ptr {
		urlValue = field.Elem().String()
	} else {
		urlValue = field.String()
	}

	// Empty string is considered valid (optional field)
	if urlValue == "" {
		return true
	}

	return validateURLInternal(urlValue)
}

// validatePhone validates phone number format with E.164 format.
func validatePhone(fl validator.FieldLevel) bool {
	field := fl.Field()

	// Handle nil pointers
	if field.Kind() == reflect.Ptr && field.IsNil() {
		return true
	}

	// Get the actual string value
	var phoneValue string
	if field.Kind() == reflect.Ptr {
		phoneValue = field.Elem().String()
	} else {
		phoneValue = field.String()
	}

	// Empty string is considered valid (optional field)
	if phoneValue == "" {
		return true
	}

	// Basic E.164 validation
	// Must start with + and be followed by 1-15 digits
	if !strings.HasPrefix(phoneValue, "+") {
		return false
	}

	// Remove the + and check if the rest are digits
	digits := phoneValue[1:]
	if len(digits) < 3 || len(digits) > 15 {
		return false
	}

	// Check that all remaining characters are digits
	for _, char := range digits {
		if char < '0' || char > '9' {
			return false
		}
	}

	return true
}

// validateImageURL validates image URL format and extensions.
func validateImageURL(fl validator.FieldLevel) bool {
	field := fl.Field()

	// Handle nil pointers
	if field.Kind() == reflect.Ptr && field.IsNil() {
		return true
	}

	// Get the actual string value
	var urlValue string
	if field.Kind() == reflect.Ptr {
		urlValue = field.Elem().String()
	} else {
		urlValue = field.String()
	}

	// Empty string is considered valid (optional field)
	if urlValue == "" {
		return true
	}

	// First validate as a regular URL
	if !validateURLInternal(urlValue) {
		return false
	}

	// Additional checks for image URLs
	urlLower := strings.ToLower(urlValue)

	// Check for non-image extensions that would indicate this is not an image URL
	nonImageExtensions := []string{
		".txt", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".zip", ".tar", ".gz",
		".mp3", ".mp4", ".avi", ".mov", ".html", ".htm", ".css", ".js", ".json", ".xml",
	}

	for _, ext := range nonImageExtensions {
		if strings.Contains(urlLower, ext) {
			return false
		}
	}

	// Allow URLs without specific extensions (could be dynamic/API generated images)
	return true
}

// validateScheduleTrigger validates schedule trigger configuration.
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

// Helper functions

// validateURLInternal performs internal URL validation.
func validateURLInternal(urlValue string) bool {
	// Check maximum length
	if len(urlValue) > URLMaxLength {
		return false
	}

	// Parse the URL
	parsedURL, err := url.Parse(urlValue)
	if err != nil {
		return false
	}

	// Must have a valid scheme
	if parsedURL.Scheme == "" {
		return false
	}

	// Must be http or https
	if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
		return false
	}

	// Must have a host
	if parsedURL.Host == "" {
		return false
	}

	return true
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

// isValidRRule validates RRule format.
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

// isValidCron validates cron expression format.
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
