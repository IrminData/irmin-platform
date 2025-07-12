package irminmodels

// Branch represents a repository branch.
type Branch struct {
	// Name of the branch
	Name string `json:"name"         validate:"required,max=100,validslug"`
	// Whether the branch is the default branch. Only one branch can be default, usually "main"
	Default bool `json:"default"`
	// Whether the branch is immutable and cannot be modified. Used for example for migrations
	IsImmutable bool `json:"is_immutable"`
}
