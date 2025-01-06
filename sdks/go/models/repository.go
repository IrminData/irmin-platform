package models

// Repository represents a repository object.
type Repository struct {
	// Repository ID
	ID string `json:"id"`
	// Name of the Repository
	Name string `json:"name"`
	// Slug of the Repository. Used by App router and to parse Queries
	Slug string `json:"slug"`
	// Short description of the Repository
	Description string `json:"description"`
	// Markdown documentation of the Repository. Allows for users to add explanations, examples, etc.
	Documentation string `json:"documentation"`
	// If the Repository is immutable, it cannot be changed or updated
	IsImmutable bool `json:"is_immutable"`
	// Default branch of the Repository
	DefaultBranch string `json:"default_branch"`
	// The user within the workspace that owns the Repository and is responsible for it
	Owner User `json:"owner"`
	// Timestamp of the creation of the Repository
	CreatedAt string `json:"created_at"`
	// Timestamp of the last update of the Repository
	UpdatedAt string `json:"updated_at"`
}
