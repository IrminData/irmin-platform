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

// GetAIApplicationByID retrieves an AI application by its ID.
func (d *Database) GetAIApplicationByID(id uint) (*AIApplication, error) {
	var aiApplication AIApplication
	if err := d.Preload("Owner").
		Preload("DataSources").
		Preload("DataSources.Repository").
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
		Preload("Tags").
		Where("api_key = ?", apiKey).
		First(&aiApplication).Error; err != nil {
		return nil, err
	}
	return &aiApplication, nil
}
