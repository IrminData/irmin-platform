package models

// IrminRole represents a role object in the system.
type IrminRole struct {
	// Human-readable description
	Description string `json:"description"`
	// Human-readable name
	Label string `json:"label"`
	// Slug of the role, e.g., 'admin', 'editor', 'billing', 'viewer', etc.
	Name string `json:"name"`
}
