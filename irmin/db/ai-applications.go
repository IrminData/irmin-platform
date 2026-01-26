package db

import (
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

// AIApplicationWriteConfig defines write operation settings for an AI Application.
type AIApplicationWriteConfig struct {
	FileUploadEnabled    bool   `json:"file_upload_enabled"`             // Allow uploading new files
	FileUpdateEnabled    bool   `json:"file_update_enabled"`             // Allow updating existing files
	PatchEnabled         bool   `json:"patch_enabled"`                   // Allow JSON Patch operations
	AutoCommit           bool   `json:"auto_commit"`                     // Auto-commit after each write
	RequireCommitMessage bool   `json:"require_commit_message"`          // Require commit message from agent
	CommitMessagePrefix  string `json:"commit_message_prefix,omitempty"` // Prefix for all commit messages
	RequireApproval      bool   `json:"require_approval"`                // Require human approval for writes
}

// AIApplicationToolConfig defines which tools are enabled for an AI Application.
type AIApplicationToolConfig struct {
	QueryEnabled        bool `json:"query_enabled"`         // Execute SQL queries
	SchemaEnabled       bool `json:"schema_enabled"`        // Get object schemas
	ListObjectsEnabled  bool `json:"list_objects_enabled"`  // List repository objects
	GetContentEnabled   bool `json:"get_content_enabled"`   // Get object content
	VectorSearchEnabled bool `json:"vector_search_enabled"` // Search embeddings in repos
	DocsEnabled         bool `json:"docs_enabled"`          // Retrieve documentation

	// Write tools configuration
	WriteEnabled bool                      `json:"write_enabled"` // Master switch for write operations
	WriteConfig  *AIApplicationWriteConfig `json:"write_config,omitempty"`
}

// AIApplication represents an AI application in the system.
type AIApplication struct {
	gorm.Model

	Name           string                    `json:"name"`
	Description    string                    `json:"description"`
	Documentation  string                    `json:"documentation"`
	AllowedOrigins []string                  `json:"allowed_origins" gorm:"type:jsonb;serializer:json"`
	Tools          *AIApplicationToolConfig  `json:"tools"           gorm:"type:jsonb;serializer:json"`
	APIKey         string                    `json:"api_key"         gorm:"uniqueIndex"`
	WorkspaceID    uint                      `json:"workspace_id"    gorm:"index"`
	Workspace      Workspace                 `json:"workspace"       gorm:"foreignKey:WorkspaceID"`
	OwnerID        uint                      `json:"owner_id"`
	Owner          User                      `json:"owner"           gorm:"foreignKey:OwnerID"`
	DataSources    []AIApplicationDataSource `json:"data_sources"    gorm:"foreignKey:AIApplicationID"`
	CustomTools    []AIApplicationCustomTool `json:"custom_tools"    gorm:"foreignKey:AIApplicationID"`
	Tags           []Tag                     `json:"tags,omitempty"  gorm:"many2many:ai_application_tags;"`
}

// ParseToolConfig returns the tool configuration, defaulting to all tools disabled if not set.
func (a *AIApplication) ParseToolConfig() AIApplicationToolConfig {
	if a.Tools == nil {
		return AIApplicationToolConfig{}
	}
	return *a.Tools
}

// AIApplicationDataSource represents a data source for an AI application.
type AIApplicationDataSource struct {
	gorm.Model

	AIApplicationID uint          `json:"ai_application_id" gorm:"index"`
	AIApplication   AIApplication `json:"ai_application"    gorm:"foreignKey:AIApplicationID"`
	RepositoryID    uint          `json:"repository_id"     gorm:"index"`
	Repository      Repository    `json:"repository"        gorm:"foreignKey:RepositoryID"`
	Branch          string        `json:"branch"`
	Path            string        `json:"path"`
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
	gorm.Model

	AIApplicationID uint           `json:"ai_application_id" gorm:"index;not null"`
	AIApplication   AIApplication  `json:"ai_application"    gorm:"foreignKey:AIApplicationID"`
	Name            string         `json:"name"              gorm:"not null"`
	Description     string         `json:"description"`
	Type            CustomToolType `json:"type"              gorm:"not null"`
	Enabled         bool           `json:"enabled"           gorm:"default:true"`

	// For stored_query type
	StoredQueryID *uint        `json:"stored_query_id,omitempty"`
	StoredQuery   *StoredQuery `json:"stored_query,omitempty"    gorm:"foreignKey:StoredQueryID"`

	// For workflow type
	WorkflowID *uint     `json:"workflow_id,omitempty"`
	Workflow   *Workflow `json:"workflow,omitempty"    gorm:"foreignKey:WorkflowID"`

	// For embedding_search type
	EmbeddingPath   string            `json:"embedding_path,omitempty"`
	EmbeddingTopK   int               `json:"embedding_top_k,omitempty"`
	EmbeddingFilter map[string]string `json:"embedding_filter,omitempty" gorm:"type:jsonb;serializer:json"`
}

// GetAIApplicationByID retrieves an AI application by its ID.
func (d *Database) GetAIApplicationByID(id uint) (*AIApplication, error) {
	var aiApplication AIApplication
	if err := d.Preload("Workspace").
		Preload("Owner").
		Preload("DataSources").
		Preload("DataSources.Repository").
		Preload("CustomTools").
		Preload("CustomTools.StoredQuery").
		Preload("CustomTools.Workflow").
		Preload("Tags").
		First(&aiApplication, id).Error; err != nil {
		return nil, err
	}
	return &aiApplication, nil
}

// GetAIApplicationsByWorkspaceID retrieves all AI applications for a workspace.
func (d *Database) GetAIApplicationsByWorkspaceID(workspaceID uint) ([]AIApplication, error) {
	var aiApplications []AIApplication
	if err := d.Preload("Owner").
		Preload("DataSources").
		Preload("DataSources.Repository").
		Preload("CustomTools").
		Preload("CustomTools.StoredQuery").
		Preload("CustomTools.Workflow").
		Preload("Tags").
		Where(&AIApplication{WorkspaceID: workspaceID}).
		Order("created_at desc").
		Find(&aiApplications).Error; err != nil {
		return nil, err
	}
	return aiApplications, nil
}

// DeleteAIApplication deletes an AI application and all related records.
func (d *Database) DeleteAIApplication(tx *gorm.DB, id uint) error {
	// Remove tag associations first
	if err := tx.Where(&AIApplicationTag{AIApplicationID: id}).Delete(&AIApplicationTag{}).Error; err != nil {
		return err
	}

	// Delete data sources
	if err := tx.Where(&AIApplicationDataSource{AIApplicationID: id}).Delete(&AIApplicationDataSource{}).Error; err != nil {
		return err
	}

	// Delete custom tools
	if err := tx.Where(&AIApplicationCustomTool{AIApplicationID: id}).Delete(&AIApplicationCustomTool{}).Error; err != nil {
		return err
	}

	// Delete pending writes first (has foreign key to tool logs)
	if err := tx.Where(&AIApplicationPendingWrite{AIApplicationID: id}).Delete(&AIApplicationPendingWrite{}).Error; err != nil {
		return err
	}

	// Delete tool audit logs (after pending writes due to foreign key constraint)
	if err := tx.Where(&AIApplicationToolLog{AIApplicationID: id}).Delete(&AIApplicationToolLog{}).Error; err != nil {
		return err
	}

	// Finally delete the AI application itself
	return tx.Delete(&AIApplication{}, id).Error
}

// GetAIApplicationByAPIKey retrieves an AI application by its API key.
// This is used for authenticating AI Application API requests.
func (d *Database) GetAIApplicationByAPIKey(apiKey string) (*AIApplication, error) {
	var aiApplication AIApplication
	if err := d.Preload("Workspace").
		Preload("Owner").
		Preload("DataSources").
		Preload("DataSources.Repository").
		Preload("CustomTools").
		Preload("CustomTools.StoredQuery").
		Preload("CustomTools.Workflow").
		Preload("Tags").
		Where("api_key = ?", apiKey).
		First(&aiApplication).Error; err != nil {
		return nil, err
	}
	return &aiApplication, nil
}

// GetCustomToolByID retrieves a custom tool by its ID.
func (d *Database) GetCustomToolByID(id uint) (*AIApplicationCustomTool, error) {
	var tool AIApplicationCustomTool
	if err := d.Preload("StoredQuery").
		Preload("Workflow").
		First(&tool, id).Error; err != nil {
		return nil, err
	}
	return &tool, nil
}

// GetCustomToolByNameAndAIApplicationID retrieves a custom tool by name and AI Application ID.
func (d *Database) GetCustomToolByNameAndAIApplicationID(
	name string,
	aiApplicationID uint,
) (*AIApplicationCustomTool, error) {
	var tool AIApplicationCustomTool
	if err := d.Preload("StoredQuery").
		Preload("Workflow").
		Where("name = ? AND ai_application_id = ?", name, aiApplicationID).
		First(&tool).Error; err != nil {
		return nil, err
	}
	return &tool, nil
}

// GetCustomToolsByAIApplicationID retrieves all custom tools for an AI Application.
func (d *Database) GetCustomToolsByAIApplicationID(aiApplicationID uint) ([]AIApplicationCustomTool, error) {
	var tools []AIApplicationCustomTool
	if err := d.Preload("StoredQuery").
		Preload("Workflow").
		Where("ai_application_id = ?", aiApplicationID).
		Order("created_at asc").
		Find(&tools).Error; err != nil {
		return nil, err
	}
	return tools, nil
}

// GetEnabledCustomToolsByAIApplicationID retrieves all enabled custom tools for an AI Application.
func (d *Database) GetEnabledCustomToolsByAIApplicationID(aiApplicationID uint) ([]AIApplicationCustomTool, error) {
	var tools []AIApplicationCustomTool
	if err := d.Preload("StoredQuery").
		Preload("Workflow").
		Where("ai_application_id = ? AND enabled = ?", aiApplicationID, true).
		Order("created_at asc").
		Find(&tools).Error; err != nil {
		return nil, err
	}
	return tools, nil
}

// CustomToolNameExists checks if a custom tool with the given name exists for an AI Application.
func (d *Database) CustomToolNameExists(name string, aiApplicationID uint, excludeID *uint) (bool, error) {
	query := d.Model(&AIApplicationCustomTool{}).
		Where("name = ? AND ai_application_id = ?", name, aiApplicationID)

	if excludeID != nil {
		query = query.Where("id != ?", *excludeID)
	}

	var count int64
	if err := query.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

// === AI Application Tool Audit Logs ===

// AIApplicationToolLogProtocol represents the protocol used for the tool call.
type AIApplicationToolLogProtocol string

const (
	// ToolLogProtocolMCP indicates the tool was called via MCP.
	ToolLogProtocolMCP AIApplicationToolLogProtocol = "mcp"
	// ToolLogProtocolREST indicates the tool was called via REST API.
	ToolLogProtocolREST AIApplicationToolLogProtocol = "rest"
)

// AIApplicationToolLog represents an audit log entry for AI Application tool calls.
type AIApplicationToolLog struct {
	gorm.Model

	AIApplicationID uint          `json:"ai_application_id" gorm:"index;not null"`
	AIApplication   AIApplication `json:"ai_application"    gorm:"foreignKey:AIApplicationID"`

	// Tool information
	ToolName   string `json:"tool_name"   gorm:"not null"`
	ToolType   string `json:"tool_type"`                     // "builtin" or "custom"
	InputsJSON string `json:"inputs_json" gorm:"type:jsonb"` // JSON-encoded tool inputs

	// Request metadata
	Protocol    AIApplicationToolLogProtocol `json:"protocol"     gorm:"not null"`
	RequestIP   string                       `json:"request_ip"`
	UserAgent   string                       `json:"user_agent"`
	Origin      string                       `json:"origin"`
	ContentType string                       `json:"content_type"`

	// Execution metadata
	DurationMs int64  `json:"duration_ms"`
	Success    bool   `json:"success"     gorm:"default:true"`
	ErrorMsg   string `json:"error_msg"`

	// Write-specific audit fields
	WriteOperation  string `json:"write_operation,omitempty"`   // "upload", "update", "patch"
	WriteTargetPath string `json:"write_target_path,omitempty"` // Path that was written to
	CommitID        string `json:"commit_id,omitempty"`         // Commit ID if changes were committed
	PendingWriteID  *uint  `json:"pending_write_id,omitempty"`  // Link to pending write if approval required
}

// CreateAIApplicationToolLog creates a new tool audit log entry.
func (d *Database) CreateAIApplicationToolLog(log *AIApplicationToolLog) error {
	return d.Create(log).Error
}

// GetAIApplicationToolLogs retrieves tool audit logs for an AI Application with pagination.
func (d *Database) GetAIApplicationToolLogs(
	aiApplicationID uint,
	toolName string,
	limit, offset int,
) ([]AIApplicationToolLog, int64, error) {
	var logs []AIApplicationToolLog
	var total int64

	// Base query
	query := d.Model(&AIApplicationToolLog{}).
		Where("ai_application_id = ?", aiApplicationID)

	// Optional tool name filter
	if toolName != "" {
		query = query.Where("tool_name = ?", toolName)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Fetch logs with pagination
	if err := query.
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&logs).Error; err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}

// GetAIApplicationToolLogStats retrieves aggregated statistics for tool calls.
func (d *Database) GetAIApplicationToolLogStats(
	aiApplicationID uint,
) (*irminmodels.AIApplicationToolLogStats, error) {
	result := &irminmodels.AIApplicationToolLogStats{
		ByTool: make([]irminmodels.AIApplicationToolStat, 0),
	}

	// Get overall aggregated stats
	var overallStats struct {
		TotalCalls      int64   `gorm:"column:total_calls"`
		SuccessfulCalls int64   `gorm:"column:successful_calls"`
		FailedCalls     int64   `gorm:"column:failed_calls"`
		AvgDurationMs   float64 `gorm:"column:avg_duration_ms"`
	}

	err := d.Model(&AIApplicationToolLog{}).
		Select(`
			COUNT(*) as total_calls,
			SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_calls,
			SUM(CASE WHEN success THEN 0 ELSE 1 END) as failed_calls,
			COALESCE(AVG(duration_ms), 0) as avg_duration_ms
		`).
		Where("ai_application_id = ?", aiApplicationID).
		Scan(&overallStats).Error

	if err != nil {
		return nil, err
	}

	result.TotalCalls = overallStats.TotalCalls
	result.SuccessfulCalls = overallStats.SuccessfulCalls
	result.FailedCalls = overallStats.FailedCalls
	result.AvgDurationMs = overallStats.AvgDurationMs

	// Get per-tool stats
	var toolStats []irminmodels.AIApplicationToolStat

	err = d.Model(&AIApplicationToolLog{}).
		Select(`
			tool_name,
			COUNT(*) as count,
			COALESCE(AVG(duration_ms), 0) as avg_duration_ms,
			SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count,
			SUM(CASE WHEN success THEN 0 ELSE 1 END) as error_count
		`).
		Where("ai_application_id = ?", aiApplicationID).
		Group("tool_name").
		Order("count desc").
		Scan(&toolStats).Error

	if err != nil {
		return nil, err
	}

	result.ByTool = toolStats
	return result, nil
}

// === AI Application Pending Writes ===

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

// AIApplicationPendingWrite represents a write operation awaiting human approval.
type AIApplicationPendingWrite struct {
	gorm.Model

	AIApplicationID uint          `json:"ai_application_id" gorm:"index;not null"`
	AIApplication   AIApplication `json:"ai_application"    gorm:"foreignKey:AIApplicationID"`

	// Link to the tool log entry that created this pending write
	ToolLogID *uint                 `json:"tool_log_id,omitempty"`
	ToolLog   *AIApplicationToolLog `json:"tool_log,omitempty"    gorm:"foreignKey:ToolLogID"`

	// Target location
	RepositoryID uint       `json:"repository_id" gorm:"index"`
	Repository   Repository `json:"repository"    gorm:"foreignKey:RepositoryID"`
	Path         string     `json:"path"`
	Ref          string     `json:"ref"`

	// Operation details
	Operation      string `json:"operation"`                                   // "upload", "update", "patch"
	Content        []byte `json:"-"                         gorm:"type:bytea"` // Full content for file operations (not serialized to JSON)
	ContentHash    string `json:"content_hash"`                                // Hash reference to staged content
	ContentPreview string `json:"content_preview,omitempty"`                   // Preview of content for display
	PatchJSON      string `json:"patch_json,omitempty"      gorm:"type:jsonb"` // For patch operations
	CommitMessage  string `json:"commit_message"`

	// Status and review
	Status       PendingWriteStatus `json:"status"                   gorm:"default:pending;index"`
	ReviewedByID *uint              `json:"reviewed_by_id,omitempty"`
	ReviewedBy   *User              `json:"reviewed_by,omitempty"    gorm:"foreignKey:ReviewedByID"`
	ReviewedAt   *time.Time         `json:"reviewed_at,omitempty"`
}

// CreateAIApplicationPendingWrite creates a new pending write entry.
func (d *Database) CreateAIApplicationPendingWrite(pw *AIApplicationPendingWrite) error {
	return d.Create(pw).Error
}

// GetAIApplicationPendingWriteByID retrieves a pending write by its ID.
func (d *Database) GetAIApplicationPendingWriteByID(id uint) (*AIApplicationPendingWrite, error) {
	var pw AIApplicationPendingWrite
	if err := d.Preload("AIApplication").
		Preload("Repository").
		Preload("ToolLog").
		Preload("ReviewedBy").
		First(&pw, id).Error; err != nil {
		return nil, err
	}
	return &pw, nil
}

// GetPendingWritesByAIApplicationID retrieves all pending writes for an AI Application.
func (d *Database) GetPendingWritesByAIApplicationID(
	aiApplicationID uint,
	status *PendingWriteStatus,
	limit, offset int,
) ([]AIApplicationPendingWrite, int64, error) {
	var pendingWrites []AIApplicationPendingWrite
	var total int64

	query := d.Model(&AIApplicationPendingWrite{}).
		Where("ai_application_id = ?", aiApplicationID)

	if status != nil {
		query = query.Where("status = ?", *status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.
		Preload("Repository").
		Preload("ToolLog").
		Preload("ReviewedBy").
		Order("created_at desc").
		Limit(limit).
		Offset(offset).
		Find(&pendingWrites).Error; err != nil {
		return nil, 0, err
	}

	return pendingWrites, total, nil
}

// UpdatePendingWriteStatus updates the status of a pending write.
func (d *Database) UpdatePendingWriteStatus(
	id uint,
	status PendingWriteStatus,
	reviewedByID *uint,
) error {
	updates := map[string]any{
		"status":      status,
		"reviewed_at": time.Now(),
	}
	if reviewedByID != nil {
		updates["reviewed_by_id"] = *reviewedByID
	}
	return d.Model(&AIApplicationPendingWrite{}).Where("id = ?", id).Updates(updates).Error
}

// UpdatePendingWriteStatusAtomic atomically updates the status of a pending write
// only if it's currently in the expected status. This prevents race conditions
// where concurrent requests could both execute the same pending write.
// Returns true if the update was successful (row was modified), false if the
// status was already changed by another request.
func (d *Database) UpdatePendingWriteStatusAtomic(
	id uint,
	expectedStatus PendingWriteStatus,
	newStatus PendingWriteStatus,
	reviewedByID *uint,
) (bool, error) {
	updates := map[string]any{
		"status":      newStatus,
		"reviewed_at": time.Now(),
	}
	if reviewedByID != nil {
		updates["reviewed_by_id"] = *reviewedByID
	}

	result := d.Model(&AIApplicationPendingWrite{}).
		Where("id = ? AND status = ?", id, expectedStatus).
		Updates(updates)

	if result.Error != nil {
		return false, result.Error
	}

	// RowsAffected == 0 means the status was already changed
	return result.RowsAffected > 0, nil
}

// RevertPendingWriteToPending reverts a pending write back to pending status,
// clearing any review metadata (reviewed_by_id and reviewed_at).
// This is used when a pending write approval fails during execution.
func (d *Database) RevertPendingWriteToPending(id uint) error {
	return d.Model(&AIApplicationPendingWrite{}).Where("id = ?", id).Updates(map[string]any{
		"status":         PendingWriteStatusPending,
		"reviewed_by_id": nil,
		"reviewed_at":    nil,
	}).Error
}

// DeletePendingWritesByAIApplicationID deletes all pending writes for an AI Application.
func (d *Database) DeletePendingWritesByAIApplicationID(tx *gorm.DB, aiApplicationID uint) error {
	return tx.Where("ai_application_id = ?", aiApplicationID).Delete(&AIApplicationPendingWrite{}).Error
}
