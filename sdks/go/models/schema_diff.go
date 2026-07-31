package irminmodels

// SchemaChangeType represents the type of change detected between two schema versions.
type SchemaChangeType string

const (
	// SchemaChangeAdded indicates a new field was added to the schema.
	SchemaChangeAdded SchemaChangeType = "added"
	// SchemaChangeRemoved indicates a field was removed from the schema.
	SchemaChangeRemoved SchemaChangeType = "removed"
	// SchemaChangeModified indicates a field's constraints or properties changed.
	SchemaChangeModified SchemaChangeType = "modified"
	// SchemaChangeTypeChanged indicates a field's data type changed.
	SchemaChangeTypeChanged SchemaChangeType = "type_changed"
	// SchemaChangeNullabilityChanged indicates a field's nullable status changed.
	SchemaChangeNullabilityChanged SchemaChangeType = "nullability_changed"
	// SchemaChangeRequiredChanged indicates a field's required status changed.
	SchemaChangeRequiredChanged SchemaChangeType = "required_changed"
)

// SchemaFieldDiff represents a single difference between two schema field definitions.
type SchemaFieldDiff struct {
	// FieldPath is the dot-notation path to the field (e.g., "customers[].email").
	FieldPath string `json:"field_path" example:"customers[].email"`

	// ChangeType categorizes the kind of change detected.
	ChangeType SchemaChangeType `json:"change_type" example:"type_changed"`

	// SourceType is the data type in the source schema (nil if field was added).
	SourceType *string `json:"source_type,omitempty" example:"string"`

	// TargetType is the data type in the target schema (nil if field was removed).
	TargetType *string `json:"target_type,omitempty" example:"integer"`

	// SourceValue holds constraint values from source (e.g., minLength, maxLength).
	SourceValue any `json:"source_value,omitempty"`

	// TargetValue holds constraint values from target.
	TargetValue any `json:"target_value,omitempty"`

	// WasRequired indicates if the field was required in the source schema.
	WasRequired *bool `json:"was_required,omitempty" example:"true"`

	// IsRequired indicates if the field is required in the target schema.
	IsRequired *bool `json:"is_required,omitempty" example:"false"`

	// WasNullable indicates if the field was nullable in the source schema.
	WasNullable *bool `json:"was_nullable,omitempty" example:"false"`

	// IsNullable indicates if the field is nullable in the target schema.
	IsNullable *bool `json:"is_nullable,omitempty" example:"true"`

	// Description provides a human-readable explanation of the change.
	Description *string `json:"description,omitempty" example:"Field type changed from string to integer"`
}

// SchemaDiff represents the complete comparison result between two schemas.
type SchemaDiff struct {
	// Compatible indicates whether the target schema is backward-compatible with source.
	// True means data valid against the source schema will also be valid against target.
	Compatible bool `json:"compatible" example:"false"`

	// BreakingChanges lists changes that would cause existing data to fail validation.
	// Examples: required field added, type changed to incompatible type, field removed.
	BreakingChanges []SchemaFieldDiff `json:"breaking_changes,omitempty"`

	// NonBreakingChanges lists changes that won't affect existing data validity.
	// Examples: optional field added, constraint relaxed, field made nullable.
	NonBreakingChanges []SchemaFieldDiff `json:"non_breaking_changes,omitempty"`

	// Summary provides a human-readable overview of all changes.
	Summary string `json:"summary" example:"2 breaking changes, 3 non-breaking changes"`

	// SourceSchemaPath identifies the source schema (e.g., file path or connection path).
	SourceSchemaPath *string `json:"source_schema_path,omitempty" example:"customers.json"`

	// TargetSchemaPath identifies the target schema.
	TargetSchemaPath *string `json:"target_schema_path,omitempty" example:"postgres/customers"`
}

// HasBreakingChanges returns true if there are any breaking changes.
func (d *SchemaDiff) HasBreakingChanges() bool {
	return len(d.BreakingChanges) > 0
}

// HasChanges returns true if there are any changes (breaking or non-breaking).
func (d *SchemaDiff) HasChanges() bool {
	return len(d.BreakingChanges) > 0 || len(d.NonBreakingChanges) > 0
}

// TotalChanges returns the total number of field differences.
func (d *SchemaDiff) TotalChanges() int {
	return len(d.BreakingChanges) + len(d.NonBreakingChanges)
}
