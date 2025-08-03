package irminmodels

// GitTag represents a repository tag object (Git-style tag with ref).
type GitTag struct {
	Name string `json:"name" validate:"required,validslug" example:"v1.0.0"`   // Tag name
	Ref  string `json:"ref"  validate:"required"           example:"1a2b3c4d"` // Commit hash referenced in a tag
}
