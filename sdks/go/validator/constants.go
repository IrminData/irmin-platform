package irminsdkvalidator

// Token validation constants.
const (
	TokenPrefix = "cred_"
	TokenLength = 64
)

// Slug validation constants.
const (
	SlugMinLength = 1
	SlugMaxLength = 100
)

// Content length validation constants.
const (
	DocumentationMaxLength = 10000
	SQLMaxLength           = 50000
	URLMaxLength           = 2000
)

// Field name conversion constants.
const (
	// FieldNameConversionBuffer is the estimated additional characters needed
	// when converting PascalCase field names to snake_case (for underscores).
	FieldNameConversionBuffer = 5
)
