package irminmodels

// Branch represents a repository branch.
type Branch struct {
	// Name of the branch
	Name string `json:"name"         validate:"required,max=100,validslug" example:"main"`
	// Whether the branch is the default branch. Only one branch can be default, usually "main"
	Default bool `json:"default"                                            example:"true"`
	// Whether the branch is immutable and cannot be modified. Used for example for migrations
	IsImmutable bool `json:"is_immutable"                                       example:"false"`
}
