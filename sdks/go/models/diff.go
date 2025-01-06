package models

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
	Object Object `json:"object"`
	// Type of the change (e.g., added, removed, changed, etc.)
	Type ChangeType `json:"type"`
	// Size of the change
	Size int `json:"size"`
}

// Diff represents the difference between two refs.
type Diff struct {
	// Name of the repository
	Repository string `json:"repository"`
	// Base reference
	BaseRef string `json:"base_ref"`
	// Compare reference
	CompareRef string `json:"compare_ref"`
	// List of changes in the diff
	Items []ChangeItem `json:"items"`
	// List of commits between the refs (optional)
	Commits *[]Commit `json:"commits,omitempty"`
}
