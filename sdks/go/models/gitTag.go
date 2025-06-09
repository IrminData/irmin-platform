package irminmodels

// GitTag represents a repository tag object (Git-style tag with ref).
type GitTag struct {
	Name string `json:"name"` // Tag name
	Ref  string `json:"ref"`  // Commit hash referenced in a tag
}
