package irminmodels

type WorkspaceSearchResultType string

const (
	WorkspaceSearchResultTypeWorkflow         WorkspaceSearchResultType = "workflow"
	WorkspaceSearchResultTypeRepository       WorkspaceSearchResultType = "repository"
	WorkspaceSearchResultTypeConnection       WorkspaceSearchResultType = "connection"
	WorkspaceSearchResultTypeQuery            WorkspaceSearchResultType = "query"
	WorkspaceSearchResultTypeUser             WorkspaceSearchResultType = "user"
	WorkspaceSearchResultTypeRepositoryObject WorkspaceSearchResultType = "repository_object"
	WorkspaceSearchResultTypeInvite           WorkspaceSearchResultType = "invite"
)

// SearchResult represents a unified search result with typed entity data.
type SearchResult struct {
	Type      WorkspaceSearchResultType `json:"type"      validate:"required,oneof=workflow repository connection query user repository_object invite"`
	Relevance float64                   `json:"relevance" validate:"required,gte=0,lte=5"`

	// Typed entity fields - only one will be populated based on Type

	Repository       *Repository  `json:"repository,omitempty"`
	RepositoryObject *Object      `json:"repository_object,omitempty"`
	Workflow         *Workflow    `json:"workflow,omitempty"`
	Connection       *Connection  `json:"connection,omitempty"`
	Query            *StoredQuery `json:"query,omitempty"`
	User             *User        `json:"user,omitempty"`
	Invite           *Invite      `json:"invite,omitempty"`
}

// SearchFilters represents the search filter options (importing from controllers).
type SearchFilters struct {
	Query    string   `json:"query"               validate:"required,min=3"`
	Types    []string `json:"types"               validate:"dive,oneof=workflow repository connection query user repository_object invite"`
	Tags     []string `json:"tags"                validate:"dive,validsqid=tags"`
	OwnerID  *string  `json:"owner_id,omitempty"  validate:"omitempty,validsqid=users"`
	DateFrom *string  `json:"date_from,omitempty" validate:"omitempty,datetime"`
	DateTo   *string  `json:"date_to,omitempty"   validate:"omitempty,datetime"`
	Limit    int      `json:"limit"               validate:"required,max=100"`
	Offset   int      `json:"offset"              validate:"min=0"`
}

// SearchResponse represents the search API response.
type SearchResponse struct {
	Results []SearchResult `json:"results" validate:"required,dive"`
	Total   int            `json:"total"   validate:"required,min=0"`
	Query   string         `json:"query"   validate:"required,min=3"`
	Filters SearchFilters  `json:"filters" validate:"required"`
}
