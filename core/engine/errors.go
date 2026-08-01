package engine

import (
	"errors"
	"fmt"
	"strings"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// Sentinel errors for connector capabilities
var (
	ErrConnectorMissingPullCapability    = errors.New("connector does not support pull operations")
	ErrConnectorMissingPushCapability    = errors.New("connector does not support push operations")
	ErrConnectorMissingPatchCapability   = errors.New("connector does not support patch operations")
	ErrConnectorMissingWebhookCapability = errors.New("connector does not support webhook operations")
)

// ConnectorSchemaValidationError wraps schema validation failures with operation context.
// This error type provides detailed information about why data failed validation
// against a connector's expected schema.
type ConnectorSchemaValidationError struct {
	// Result contains the detailed validation errors and warnings.
	Result *irminmodels.SchemaValidationResult

	// OperationType indicates the operation that failed (e.g., "push", "pull").
	OperationType string

	// ConnectionName identifies which connection the validation was for.
	ConnectionName string

	// ConnectionPath is the target path within the connection.
	ConnectionPath string
}

// Error implements the error interface.
func (e *ConnectorSchemaValidationError) Error() string {
	errorCount := 0
	if e.Result != nil {
		errorCount = len(e.Result.Errors)
	}
	return fmt.Sprintf("schema validation failed for %s operation on connection '%s': %d error(s)",
		e.OperationType, e.ConnectionName, errorCount)
}

// Unwrap returns nil as this error does not wrap another error.
func (e *ConnectorSchemaValidationError) Unwrap() error {
	return nil
}

// FormatUserMessage returns a user-friendly error message with details.
func (e *ConnectorSchemaValidationError) FormatUserMessage() string {
	if e.Result == nil || len(e.Result.Errors) == 0 {
		return e.Error()
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("Data validation failed for %s operation:\n\n", e.OperationType))

	// Group errors by file if multiple files
	if len(e.Result.FilesSummary) > 1 {
		for fileName, count := range e.Result.FilesSummary {
			sb.WriteString(fmt.Sprintf("  %s: %d error(s)\n", fileName, count))
		}
		sb.WriteString("\n")
	}

	// Show first few errors with details
	maxErrors := 5
	for i, err := range e.Result.Errors {
		if i >= maxErrors {
			remaining := len(e.Result.Errors) - maxErrors
			sb.WriteString(fmt.Sprintf("\n  ... and %d more error(s)\n", remaining))
			break
		}

		sb.WriteString(fmt.Sprintf("  • %s: %s\n", err.FieldPath, err.Message))
		if err.Suggestion != nil {
			sb.WriteString(fmt.Sprintf("    Suggestion: %s\n", *err.Suggestion))
		}
	}

	return sb.String()
}

// GetFirstError returns the first validation error, or nil if there are none.
func (e *ConnectorSchemaValidationError) GetFirstError() *irminmodels.SchemaValidationError {
	if e.Result == nil || len(e.Result.Errors) == 0 {
		return nil
	}
	return &e.Result.Errors[0]
}

// HasErrors returns true if there are any validation errors.
func (e *ConnectorSchemaValidationError) HasErrors() bool {
	return e.Result != nil && len(e.Result.Errors) > 0
}

// ErrorCount returns the number of validation errors.
func (e *ConnectorSchemaValidationError) ErrorCount() int {
	if e.Result == nil {
		return 0
	}
	return len(e.Result.Errors)
}

// IsSchemaValidationError checks if an error is a ConnectorSchemaValidationError.
func IsSchemaValidationError(err error) bool {
	var schemaErr *ConnectorSchemaValidationError
	return errors.As(err, &schemaErr)
}

// AsSchemaValidationError attempts to convert an error to ConnectorSchemaValidationError.
// Returns nil if the error is not a schema validation error.
func AsSchemaValidationError(err error) *ConnectorSchemaValidationError {
	var schemaErr *ConnectorSchemaValidationError
	if errors.As(err, &schemaErr) {
		return schemaErr
	}
	return nil
}
