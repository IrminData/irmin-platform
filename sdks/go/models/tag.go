package irminModels

// Tag represents a repository tag object.
type Tag struct {
	Name string `json:"name"` // Tag name
	Ref  string `json:"ref"`  // Commit hash referenced in a tag
}
