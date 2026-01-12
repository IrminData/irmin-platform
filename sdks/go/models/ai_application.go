package irminmodels

import "time"

// AIApplicationDataSource represents a data source for an AI application.
type AIApplicationDataSource struct {
	Repository string `json:"repository" validate:"required" example:"customer-analytics"`
	Branch     string `json:"branch"     validate:"required" example:"main"`
	Path       string `json:"path"       validate:"required" example:"/data/customers"`
}

// AIAppDataSourceUnified represents a data source with a unified path format.
// The unified path includes the repository slug as a prefix: /{repository-slug}/{path}
type AIAppDataSourceUnified struct {
	Path string `json:"path" example:"/customer-analytics/data/customers"`
}

// AIApplicationToolConfig defines which tools are enabled for an AI Application.
type AIApplicationToolConfig struct {
	QueryEnabled        bool `json:"query_enabled"         example:"true"`
	SchemaEnabled       bool `json:"schema_enabled"        example:"true"`
	ListObjectsEnabled  bool `json:"list_objects_enabled"  example:"true"`
	GetContentEnabled   bool `json:"get_content_enabled"   example:"true"`
	VectorSearchEnabled bool `json:"vector_search_enabled" example:"true"`
	DocsEnabled         bool `json:"docs_enabled"          example:"true"`
}

// CustomToolType defines the type of custom tool.
type CustomToolType string

const (
	// CustomToolTypeStoredQuery executes a stored SQL query.
	CustomToolTypeStoredQuery CustomToolType = "stored_query"
	// CustomToolTypeWorkflow triggers a workflow run.
	CustomToolTypeWorkflow CustomToolType = "workflow"
	// CustomToolTypeEmbeddingSearch searches a specific embedding file.
	CustomToolTypeEmbeddingSearch CustomToolType = "embedding_search"
)

// AIApplicationCustomTool represents a custom tool defined for an AI Application.
type AIApplicationCustomTool struct {
	ID          string         `json:"id"          validate:"required,validsqid=ai_application_custom_tools"        example:"ct_8x2m9k4n7p5q"`
	Name        string         `json:"name"        validate:"required,max=100"                                      example:"list_users"`
	Description string         `json:"description" validate:"max=500"                                               example:"List all users in the system"`
	Type        CustomToolType `json:"type"        validate:"required,oneof=stored_query workflow embedding_search" example:"stored_query"`
	Enabled     bool           `json:"enabled"                                                                      example:"true"`

	// For stored_query type
	StoredQueryID *string `json:"stored_query_id,omitempty" validate:"omitempty,validsqid=queries" example:"qry_1a2b3c4d"`

	// For workflow type
	WorkflowID *string `json:"workflow_id,omitempty" validate:"omitempty,validsqid=workflows" example:"wf_1a2b3c4d"`

	// For embedding_search type
	EmbeddingPath   string            `json:"embedding_path,omitempty"   example:"/repo-slug/main/embeddings/docs.parquet"`
	EmbeddingTopK   int               `json:"embedding_top_k,omitempty"  example:"10"`
	EmbeddingFilter map[string]string `json:"embedding_filter,omitempty"`

	CreatedAt time.Time `json:"created_at" validate:"required" example:"2025-01-15T10:30:00Z"`
	UpdatedAt time.Time `json:"updated_at" validate:"required" example:"2025-12-01T14:22:30Z"`
}

// AIApplication represents an AI application in the system.
type AIApplication struct {
	ID             string                    `json:"id"                     validate:"required,validsqid=ai_applications" example:"ai_8x2m9k4n7p5q"`
	Name           string                    `json:"name"                   validate:"required,max=100"                   example:"Customer Analytics App"`
	Description    string                    `json:"description"            validate:"max=500"                            example:"AI application for customer data analysis"`
	Documentation  string                    `json:"documentation"          validate:"validdocumentation"                 example:"# Customer Analytics"`
	AllowedOrigins []string                  `json:"allowed_origins"        validate:"dive,max=255"                       example:"https://app.example.com,http://localhost:3000"`
	Tools          *AIApplicationToolConfig  `json:"tools,omitempty"`
	CustomTools    []AIApplicationCustomTool `json:"custom_tools,omitempty" validate:"dive"`
	DataSources    []AIApplicationDataSource `json:"data_sources"           validate:"dive"`
	APIKey         *string                   `json:"api_key,omitempty"`
	Owner          User                      `json:"owner"                  validate:"required"`
	Tags           []Tag                     `json:"tags,omitempty"         validate:"dive"`
	CreatedAt      time.Time                 `json:"created_at"             validate:"required"                           example:"2025-01-15T10:30:00Z"`
	UpdatedAt      time.Time                 `json:"updated_at"             validate:"required"                           example:"2025-12-01T14:22:30Z"`
}
