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

// AIApplicationWriteConfig defines write operation settings for an AI Application.
type AIApplicationWriteConfig struct {
	FileUploadEnabled    bool   `json:"file_upload_enabled"             example:"true"`
	FileUpdateEnabled    bool   `json:"file_update_enabled"             example:"true"`
	PatchEnabled         bool   `json:"patch_enabled"                   example:"true"`
	AutoCommit           bool   `json:"auto_commit"                     example:"true"`
	RequireCommitMessage bool   `json:"require_commit_message"          example:"false"`
	CommitMessagePrefix  string `json:"commit_message_prefix,omitempty" example:"[AI Agent] "`
	RequireApproval      bool   `json:"require_approval"                example:"false"`
}

// AIApplicationToolConfig defines which tools are enabled for an AI Application.
type AIApplicationToolConfig struct {
	QueryEnabled        bool `json:"query_enabled"         example:"true"`
	SchemaEnabled       bool `json:"schema_enabled"        example:"true"`
	ListObjectsEnabled  bool `json:"list_objects_enabled"  example:"true"`
	GetContentEnabled   bool `json:"get_content_enabled"   example:"true"`
	VectorSearchEnabled bool `json:"vector_search_enabled" example:"true"`
	DocsEnabled         bool `json:"docs_enabled"          example:"true"`

	// Write tools configuration
	WriteEnabled bool                      `json:"write_enabled"          example:"false"`
	WriteConfig  *AIApplicationWriteConfig `json:"write_config,omitempty"`
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

// AIApplicationToolLog represents an audit log entry for an AI application tool call.
type AIApplicationToolLog struct {
	ID         uint      `json:"id"          example:"123"`
	ToolName   string    `json:"tool_name"   example:"irmin_execute_sql"`
	ToolType   string    `json:"tool_type"   example:"builtin"`
	InputsJSON string    `json:"inputs_json"`
	Protocol   string    `json:"protocol"    example:"mcp"`
	RequestIP  string    `json:"request_ip"  example:"192.168.1.1"`
	UserAgent  string    `json:"user_agent"  example:"Claude/1.0"`
	Origin     string    `json:"origin"      example:"https://app.example.com"`
	DurationMs int64     `json:"duration_ms" example:"150"`
	Success    bool      `json:"success"     example:"true"`
	ErrorMsg   string    `json:"error_msg"`
	CreatedAt  time.Time `json:"created_at"  example:"2025-01-15T10:30:00Z"`

	// Write-specific audit fields
	WriteOperation  string  `json:"write_operation,omitempty"   example:"upload"`
	WriteTargetPath string  `json:"write_target_path,omitempty" example:"/repo/main/data/file.json"`
	CommitID        string  `json:"commit_id,omitempty"         example:"abc123def456"`
	PendingWriteID  *string `json:"pending_write_id,omitempty"  example:"pw_1a2b3c4d"`
}

// PendingWriteStatus represents the status of a pending write operation.
type PendingWriteStatus string

const (
	// PendingWriteStatusPending indicates the write is awaiting approval.
	PendingWriteStatusPending PendingWriteStatus = "pending"
	// PendingWriteStatusApproved indicates the write has been approved and executed.
	PendingWriteStatusApproved PendingWriteStatus = "approved"
	// PendingWriteStatusRejected indicates the write has been rejected.
	PendingWriteStatusRejected PendingWriteStatus = "rejected"
)

// AIApplicationPendingWrite represents a write operation awaiting approval.
type AIApplicationPendingWrite struct {
	ID              string             `json:"id"                        validate:"required,validsqid=ai_application_pending_writes" example:"pw_1a2b3c4d"`
	AIApplicationID string             `json:"ai_application_id"         validate:"required,validsqid=ai_applications"               example:"ai_8x2m9k4n7p5q"`
	Repository      string             `json:"repository"                                                                            example:"customer-analytics"`
	Path            string             `json:"path"                                                                                  example:"/data/customers.json"`
	Ref             string             `json:"ref"                                                                                   example:"main"`
	Operation       string             `json:"operation"                                                                             example:"upload"`
	ContentPreview  string             `json:"content_preview,omitempty"`
	PatchJSON       string             `json:"patch_json,omitempty"`
	CommitMessage   string             `json:"commit_message"                                                                        example:"Updated customer data"`
	Status          PendingWriteStatus `json:"status"                                                                                example:"pending"`
	ReviewedBy      *User              `json:"reviewed_by,omitempty"`
	ReviewedAt      *time.Time         `json:"reviewed_at,omitempty"`
	CreatedAt       time.Time          `json:"created_at"                validate:"required"                                         example:"2025-01-15T10:30:00Z"`
	UpdatedAt       time.Time          `json:"updated_at"                validate:"required"                                         example:"2025-12-01T14:22:30Z"`
}

// AIApplicationPendingWritesResponse represents a paginated list of pending writes.
type AIApplicationPendingWritesResponse struct {
	PendingWrites []AIApplicationPendingWrite `json:"pending_writes"`
	Total         int64                       `json:"total"          example:"10"`
	Limit         int                         `json:"limit"          example:"50"`
	Offset        int                         `json:"offset"         example:"0"`
}

// AIApplicationToolLogsResponse represents a paginated list of tool logs.
type AIApplicationToolLogsResponse struct {
	Logs   []AIApplicationToolLog `json:"logs"`
	Total  int64                  `json:"total"  example:"100"`
	Limit  int                    `json:"limit"  example:"50"`
	Offset int                    `json:"offset" example:"0"`
}

// AIApplicationToolStat represents statistics for a specific tool.
type AIApplicationToolStat struct {
	ToolName      string  `json:"tool_name"       example:"irmin_execute_sql"`
	Count         int64   `json:"count"           example:"150"`
	AvgDurationMs float64 `json:"avg_duration_ms" example:"125.5"`
	SuccessCount  int64   `json:"success_count"   example:"147"`
	ErrorCount    int64   `json:"error_count"     example:"3"`
}

// AIApplicationToolLogStats represents aggregated statistics for tool calls.
type AIApplicationToolLogStats struct {
	TotalCalls      int64                   `json:"total_calls"      example:"500"`
	SuccessfulCalls int64                   `json:"successful_calls" example:"485"`
	FailedCalls     int64                   `json:"failed_calls"     example:"15"`
	AvgDurationMs   float64                 `json:"avg_duration_ms"  example:"125.5"`
	ByTool          []AIApplicationToolStat `json:"by_tool"`
}
