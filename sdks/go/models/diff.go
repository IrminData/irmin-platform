package irminmodels

// ChangeType represents the type of change in a diff.
type ChangeType string

const (
	ChangeTypeAdded    ChangeType = "added"
	ChangeTypeRemoved  ChangeType = "removed"
	ChangeTypeChanged  ChangeType = "changed"
	ChangeTypeConflict ChangeType = "conflict"
	ChangeTypeMoved    ChangeType = "moved"
)

// MergeStrategy represents possible merge strategies.
type MergeStrategy string

const (
	MergeStrategyDefault    MergeStrategy = "default"
	MergeStrategySourceWins MergeStrategy = "source-wins"
	MergeStrategyDestWins   MergeStrategy = "dest-wins"
)

// ChangeItem represents a single change in a diff.
type ChangeItem struct {
	// Object affected by the change
	Object Object `json:"object" validate:"required"`
	// Type of the change (e.g., added, removed, changed, etc.)
	Type ChangeType `json:"type"   validate:"required,oneof=added removed changed conflict moved" example:"added"`
	// Size of the change
	Size int `json:"size"   validate:"required,min=0"                                      example:"100"`
}

// ObjectSchemaDiff represents schema changes for a specific object path.
type ObjectSchemaDiff struct {
	// Path of the object whose schema changed
	Path string `json:"path" validate:"required" example:"customers.json"`
	// Schema diff details
	Diff *SchemaDiff `json:"diff" validate:"required"`
}

// Diff represents the difference between two refs.
type Diff struct {
	// Slug of the repository
	Repository string `json:"repository"             validate:"required,validslug" example:"customer-analytics"`
	// Base reference
	BaseRef string `json:"base_ref"               validate:"required"           example:"main"`
	// Compare reference
	CompareRef string `json:"compare_ref"            validate:"required"           example:"development"`
	// List of changes in the diff
	Items []ChangeItem `json:"items"                  validate:"required,dive"`
	// List of commits between the refs
	Commits []Commit `json:"commits,omitempty"      validate:"dive"`
	// Schema diffs for objects that have schema changes
	SchemaDiffs []ObjectSchemaDiff `json:"schema_diffs,omitempty" validate:"dive"`
}
