package irminmodels

// SchemaValidationErrorType categorizes the kind of validation failure.
type SchemaValidationErrorType string

const (
	// ValidationErrorMissingField indicates a required field is not present in the data.
	ValidationErrorMissingField SchemaValidationErrorType = "missing_required_field"
	// ValidationErrorTypeMismatch indicates the data type doesn't match the schema.
	ValidationErrorTypeMismatch SchemaValidationErrorType = "type_mismatch"
	// ValidationErrorConstraint indicates a constraint violation (e.g., min/max length).
	ValidationErrorConstraint SchemaValidationErrorType = "constraint_violation"
	// ValidationErrorFormat indicates the value doesn't match the expected format.
	ValidationErrorFormat SchemaValidationErrorType = "format_invalid"
	// ValidationErrorExtraField indicates an unexpected field in strict mode.
	ValidationErrorExtraField SchemaValidationErrorType = "unexpected_field"
	// ValidationErrorNullValue indicates a null value where not allowed.
	ValidationErrorNullValue SchemaValidationErrorType = "null_not_allowed"
	// ValidationErrorEnumValue indicates the value is not in the allowed enum list.
	ValidationErrorEnumValue SchemaValidationErrorType = "invalid_enum_value"
	// ValidationErrorArrayItems indicates array items don't match the schema.
	ValidationErrorArrayItems SchemaValidationErrorType = "invalid_array_items"
)

// SchemaValidationError represents a single validation failure with detailed context.
type SchemaValidationError struct {
	// Type categorizes the validation failure.
	Type SchemaValidationErrorType `json:"type" example:"type_mismatch"`

	// FieldPath is the JSON path to the field that failed validation.
	// Uses bracket notation for arrays: "customers[0].email", "orders[2].items[0].price"
	FieldPath string `json:"field_path" example:"customers[0].email"`

	// Message is a human-readable description of the validation failure.
	Message string `json:"message" example:"expected string, got integer"`

	// ExpectedType is the type expected according to the schema.
	ExpectedType *string `json:"expected_type,omitempty" example:"string"`

	// ActualType is the actual type found in the data.
	ActualType *string `json:"actual_type,omitempty" example:"integer"`

	// ActualValue is the actual value that failed validation (truncated for large values).
	ActualValue any `json:"actual_value,omitempty"`

	// ExpectedValue describes what was expected (for enum, format, constraint errors).
	ExpectedValue any `json:"expected_value,omitempty"`

	// Suggestion provides actionable advice on how to fix the error.
	Suggestion *string `json:"suggestion,omitempty" example:"Convert 'age' values to integers"`

	// FileName identifies which file in a multi-file validation contains the error.
	FileName *string `json:"file_name,omitempty" example:"customers.json"`

	// RowIndex identifies the array index for errors in array items.
	RowIndex *int `json:"row_index,omitempty" example:"5"`
}

// SchemaValidationResult represents the complete outcome of schema validation.
type SchemaValidationResult struct {
	// Valid is true if all data passed validation against the schema.
	Valid bool `json:"valid" example:"false"`

	// Errors contains detailed information about each validation failure.
	Errors []SchemaValidationError `json:"errors,omitempty"`

	// Warnings contains non-fatal issues (e.g., deprecated fields, recommendations).
	Warnings []string `json:"warnings,omitempty"`

	// FilesSummary maps file names to their error counts for multi-file validation.
	FilesSummary map[string]int `json:"files_summary,omitempty"`

	// TotalRecordsValidated is the count of records/rows that were validated.
	TotalRecordsValidated *int `json:"total_records_validated,omitempty" example:"1000"`

	// FailedRecords is the count of records that had at least one error.
	FailedRecords *int `json:"failed_records,omitempty" example:"15"`
}

// NewValidResult creates a new valid SchemaValidationResult.
func NewValidResult() *SchemaValidationResult {
	return &SchemaValidationResult{
		Valid:    true,
		Errors:   []SchemaValidationError{},
		Warnings: []string{},
	}
}

// NewInvalidResult creates a new invalid SchemaValidationResult with initial errors.
func NewInvalidResult(errors ...SchemaValidationError) *SchemaValidationResult {
	result := &SchemaValidationResult{
		Valid:    false,
		Errors:   errors,
		Warnings: []string{},
	}

	// Build file summary from errors
	for _, err := range errors {
		if err.FileName != nil {
			if result.FilesSummary == nil {
				result.FilesSummary = make(map[string]int)
			}
			result.FilesSummary[*err.FileName]++
		}
	}

	return result
}

// HasErrors returns true if validation found any errors.
func (r *SchemaValidationResult) HasErrors() bool {
	return len(r.Errors) > 0
}

// HasWarnings returns true if validation produced any warnings.
func (r *SchemaValidationResult) HasWarnings() bool {
	return len(r.Warnings) > 0
}

// ErrorCount returns the total number of validation errors.
func (r *SchemaValidationResult) ErrorCount() int {
	return len(r.Errors)
}

// ErrorsByType groups errors by their type for easier analysis.
func (r *SchemaValidationResult) ErrorsByType() map[SchemaValidationErrorType][]SchemaValidationError {
	result := make(map[SchemaValidationErrorType][]SchemaValidationError)
	for _, err := range r.Errors {
		result[err.Type] = append(result[err.Type], err)
	}
	return result
}

// ErrorsByFile groups errors by file name for multi-file validation results.
func (r *SchemaValidationResult) ErrorsByFile() map[string][]SchemaValidationError {
	result := make(map[string][]SchemaValidationError)
	for _, err := range r.Errors {
		fileName := ""
		if err.FileName != nil {
			fileName = *err.FileName
		}
		result[fileName] = append(result[fileName], err)
	}
	return result
}

// FirstNErrors returns at most n errors (useful for summarizing large error sets).
func (r *SchemaValidationResult) FirstNErrors(n int) []SchemaValidationError {
	if n >= len(r.Errors) {
		return r.Errors
	}
	return r.Errors[:n]
}

// AddError appends a validation error to the result and marks it as invalid.
func (r *SchemaValidationResult) AddError(err SchemaValidationError) {
	r.Valid = false
	r.Errors = append(r.Errors, err)

	// Update file summary if file name is provided
	if err.FileName != nil {
		if r.FilesSummary == nil {
			r.FilesSummary = make(map[string]int)
		}
		r.FilesSummary[*err.FileName]++
	}
}

// AddWarning appends a warning message to the result.
func (r *SchemaValidationResult) AddWarning(warning string) {
	r.Warnings = append(r.Warnings, warning)
}
