// Package validation provides unified schema validation for the Irmin data engine.
// It supports JSON schema validation, DuckDB-based structured file validation,
// and schema compatibility checking.
package validation

import (
	"context"
	"log/slog"

	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// Re-export SDK types for convenience.
// These are the canonical types used throughout the codebase.
type (
	// SchemaValidationResult represents the complete outcome of schema validation.
	SchemaValidationResult = irminmodels.SchemaValidationResult

	// SchemaValidationError represents a single validation failure with detailed context.
	SchemaValidationError = irminmodels.SchemaValidationError

	// SchemaValidationErrorType categorizes the kind of validation failure.
	SchemaValidationErrorType = irminmodels.SchemaValidationErrorType

	// ObjectSchema represents a schema for an object (file or directory).
	ObjectSchema = irminmodels.ObjectSchema

	// JSONSchema represents a JSON Schema definition.
	JSONSchema = irminmodels.JSONSchema

	// SchemaDiff represents a comparison between two schemas.
	SchemaDiff = irminmodels.SchemaDiff

	// SchemaFieldDiff represents a single field-level difference between two schemas.
	SchemaFieldDiff = irminmodels.SchemaFieldDiff
)

// Re-export error type constants for convenience.
const (
	ValidationErrorMissingField = irminmodels.ValidationErrorMissingField
	ValidationErrorTypeMismatch = irminmodels.ValidationErrorTypeMismatch
	ValidationErrorConstraint   = irminmodels.ValidationErrorConstraint
	ValidationErrorFormat       = irminmodels.ValidationErrorFormat
	ValidationErrorExtraField   = irminmodels.ValidationErrorExtraField
	ValidationErrorNullValue    = irminmodels.ValidationErrorNullValue
	ValidationErrorEnumValue    = irminmodels.ValidationErrorEnumValue
	ValidationErrorArrayItems   = irminmodels.ValidationErrorArrayItems
)

// Config holds configuration for schema validation operations.
type Config struct {
	// Ctx is the context for the validation operation.
	Ctx context.Context

	// Env provides environment configuration for DuckDB operations.
	Env *utils.CoreAPIEnv

	// Logger is used for logging validation operations.
	Logger *slog.Logger
}

// NewValidResult creates a new valid SchemaValidationResult.
func NewValidResult() *SchemaValidationResult {
	return irminmodels.NewValidResult()
}

// NewInvalidResult creates a new invalid SchemaValidationResult with initial errors.
func NewInvalidResult(errors ...SchemaValidationError) *SchemaValidationResult {
	return irminmodels.NewInvalidResult(errors...)
}

// ptr returns a pointer to the given string value.
func ptr(v string) *string {
	return &v
}
