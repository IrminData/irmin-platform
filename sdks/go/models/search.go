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
	Type      WorkspaceSearchResultType `json:"type"`
	Relevance float64                   `json:"relevance"`

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
	Query    string   `json:"query"`
	Types    []string `json:"types"`
	Tags     []string `json:"tags"`
	OwnerID  *string  `json:"owner_id,omitempty"`
	DateFrom *string  `json:"date_from,omitempty"`
	DateTo   *string  `json:"date_to,omitempty"`
	Limit    int      `json:"limit"`
	Offset   int      `json:"offset"`
}

// SearchResponse represents the search API response.
type SearchResponse struct {
	Results []SearchResult `json:"results"`
	Total   int            `json:"total"`
	Query   string         `json:"query"`
	Filters SearchFilters  `json:"filters"`
}
