package irminmodels

type WorkspaceSearchResultType string

const (
	WorkspaceSearchResultTypeWorkflow         WorkspaceSearchResultType = "workflow"
	WorkspaceSearchResultTypeRepository       WorkspaceSearchResultType = "repository"
	WorkspaceSearchResultTypeConnection       WorkspaceSearchResultType = "connection"
	WorkspaceSearchResultTypeQuery            WorkspaceSearchResultType = "query"
	WorkspaceSearchResultTypeScript           WorkspaceSearchResultType = "script"
	WorkspaceSearchResultTypeUser             WorkspaceSearchResultType = "user"
	WorkspaceSearchResultTypeRepositoryObject WorkspaceSearchResultType = "repository_object"
	WorkspaceSearchResultTypeInvite           WorkspaceSearchResultType = "invite"
)

// SearchResult represents a unified search result with typed entity data.
type SearchResult struct {
	Type      WorkspaceSearchResultType `json:"type"      validate:"required,oneof=workflow repository connection query script user repository_object invite" example:"repository"`
	Relevance float64                   `json:"relevance" validate:"required,gte=0,lte=5"                                                                     example:"4.2"`

	// Typed entity fields - only one will be populated based on Type

	Repository       *Repository   `json:"repository,omitempty"`
	RepositoryObject *Object       `json:"repository_object,omitempty"`
	Workflow         *Workflow     `json:"workflow,omitempty"`
	Connection       *Connection   `json:"connection,omitempty"`
	Query            *StoredQuery  `json:"query,omitempty"`
	Script           *StoredScript `json:"script,omitempty"`
	User             *User         `json:"user,omitempty"`
	Invite           *Invite       `json:"invite,omitempty"`
}

// SearchFilters represents the search filter options (importing from controllers).
type SearchFilters struct {
	Query    string   `json:"query"               validate:"required,min=3"                                                                       example:"customer data"`
	Types    []string `json:"types"               validate:"dive,oneof=workflow repository connection query script user repository_object invite" example:"repository,workflow"`
	Tags     []string `json:"tags"                validate:"dive,validsqid=tags"                                                                  example:"tag_8x2m9k4n7p5q,tag_9y3n0l5o8r6s"`
	OwnerID  *string  `json:"owner_id,omitempty"  validate:"omitempty,validsqid=users"                                                            example:"usr_2k8n9q1m7p3x4z"`
	DateFrom *string  `json:"date_from,omitempty" validate:"omitempty,datetime"                                                                   example:"2025-01-01T00:00:00Z"`
	DateTo   *string  `json:"date_to,omitempty"   validate:"omitempty,datetime"                                                                   example:"2025-12-31T23:59:59Z"`
	Limit    int      `json:"limit"               validate:"required,max=100"                                                                     example:"20"`
	Offset   int      `json:"offset"              validate:"min=0"                                                                                example:"0"`
}

// SearchResponse represents the search API response.
type SearchResponse struct {
	Results []SearchResult `json:"results" validate:"required,dive"`
	Total   int            `json:"total"   validate:"required,min=0" example:"42"`
	Query   string         `json:"query"   validate:"required,min=3" example:"customer data"`
	Filters SearchFilters  `json:"filters" validate:"required"`
}
