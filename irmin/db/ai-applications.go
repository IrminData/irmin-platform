package db

import (
	"gorm.io/gorm"
)

// AIApplicationToolConfig defines which tools are enabled for an AI Application.
type AIApplicationToolConfig struct {
	QueryEnabled        bool `json:"query_enabled"`         // Execute SQL queries
	SchemaEnabled       bool `json:"schema_enabled"`        // Get object schemas
	ListObjectsEnabled  bool `json:"list_objects_enabled"`  // List repository objects
	GetContentEnabled   bool `json:"get_content_enabled"`   // Get object content
	VectorSearchEnabled bool `json:"vector_search_enabled"` // Search embeddings in repos
	DocsEnabled         bool `json:"docs_enabled"`          // Retrieve documentation
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
	if err := d.Preload("Owner").
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
