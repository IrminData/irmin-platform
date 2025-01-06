package models

// Tag represents a repository tag object.
type Tag struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	// Commit hash referenced in a tag
	Ref string `json:"ref"`
}
