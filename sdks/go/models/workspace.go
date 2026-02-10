package irminmodels

type Workspace struct {
	ID          string `json:"id"              validate:"required,validsqid=workspaces" example:"ws_5n8k2m7x9q4p"`
	Name        string `json:"name"            validate:"required,max=100"              example:"Data Analytics Team"`
	Slug        string `json:"slug"            validate:"required,validslug"            example:"data-analytics-team"`
	Description string `json:"description"     validate:"max=500"                       example:"Workspace for data analytics and business intelligence projects"`
	Owner       User   `json:"owner,omitempty" validate:"required"`
	Users       []User `json:"users,omitempty" validate:"dive"`
}

// WorkspaceSummary is a lightweight workspace representation with resource counts,
// designed for listing workspaces without loading full user objects.
type WorkspaceSummary struct {
	ID              string  `json:"id"                         validate:"required,validsqid=workspaces" example:"ws_5n8k2m7x9q4p"`
	Name            string  `json:"name"                       validate:"required,max=100"              example:"Data Analytics Team"`
	Slug            string  `json:"slug"                       validate:"required,validslug"            example:"data-analytics-team"`
	Description     string  `json:"description"                validate:"max=500"                       example:"Workspace for data analytics"`
	Owner           User    `json:"owner,omitempty"            validate:"required"`
	MemberCount     int     `json:"member_count"                                                        example:"12"`
	RepositoryCount int     `json:"repository_count"                                                    example:"5"`
	WorkflowCount   int     `json:"workflow_count"                                                      example:"8"`
	ConnectionCount int     `json:"connection_count"                                                    example:"3"`
	LastAccessedAt  *string `json:"last_accessed_at,omitempty"                                          example:"2025-01-15T10:30:00Z"`
}
