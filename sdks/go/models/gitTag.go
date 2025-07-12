package irminmodels

// GitTag represents a repository tag object (Git-style tag with ref).
type GitTag struct {
	Name string `json:"name" validate:"required,validslug"` // Tag name
	Ref  string `json:"ref"  validate:"required"`           // Commit hash referenced in a tag
}
