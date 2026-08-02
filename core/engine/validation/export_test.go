package validation

// This file exports internal functions for testing purposes.
// It uses package validation (not validation_test) so it can access internal functions,
// but is only compiled during testing.

// Export internal functions from json_validator.go
var (
	GetTypeName        = getTypeName
	JoinValidationPath = joinValidationPath
)

// Export internal functions from schema_compatibility.go
var FormatChangeDescription = formatChangeDescription

// Export internal functions from validator.go
var (
	IsJSONFile          = isJSONFile
	ValidateContentType = validateContentType
	GetBaseName         = getBaseName
)

// Ptr is a helper to create a pointer to a value (used in tests)
func Ptr[T any](v T) *T {
	return &v
}
