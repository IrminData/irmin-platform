package db

import (
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

type RepositorySchemaCache struct {
	gorm.Model

	Path         string                    `json:"path,omitempty"`
	Ref          string                    `json:"ref,omitempty"`
	Schema       *irminmodels.ObjectSchema `json:"schema,omitempty"        gorm:"type:jsonb;serializer:json"`
	RepositoryID uint                      `json:"repository_id,omitempty" gorm:"index"`
	Repository   Repository                `json:"repository"              gorm:"foreignKey:RepositoryID"`
}

type Repository struct {
	gorm.Model

	Name                   string                              `json:"name"`
	LakeFSRepoID           string                              `json:"lakefs_repo_id"                     gorm:"index"`
	Slug                   string                              `json:"slug"                               gorm:"uniqueIndex"`
	Description            string                              `json:"description"`
	Documentation          string                              `json:"documentation"`
	StorageNamespace       string                              `json:"storage_namespace"`
	IsImmutable            bool                                `json:"is_immutable"`
	DefaultBranch          string                              `json:"default_branch"`
	GarbageCollectionRules *irminmodels.GarbageCollectionRules `json:"garbage_collection_rules,omitempty" gorm:"type:jsonb;serializer:json"`
	Workspace              Workspace                           `json:"workspace"                          gorm:"foreignKey:WorkspaceID"`
	WorkspaceID            uint                                `json:"workspace_id"                       gorm:"index"`
	Owner                  User                                `json:"owner"                              gorm:"foreignKey:OwnerID"`
	OwnerID                uint                                `json:"owner_id"`
	SchemaCache            []RepositorySchemaCache             `json:"schema_cache,omitempty"             gorm:"foreignKey:RepositoryID"`
	Tags                   []Tag                               `json:"tags,omitempty"                     gorm:"many2many:repository_tags;"`
}

func (d *Database) GetRepositoryBySlugAndWorkspaceID(slug string, workspaceID uint) (*Repository, error) {
	var repository Repository
	err := d.Where("slug = ? AND workspace_id = ?", slug, workspaceID).
		Preload("Owner").
		Preload("Tags").
		First(&repository).
		Error
	return &repository, err
}

func (d *Database) CheckIfRepositoryExists(slug string, workspaceID uint) bool {
	var repository Repository
	d.Where("slug = ? AND workspace_id = ?", slug, workspaceID).Preload("Owner").First(&repository)
	return repository.ID != 0
}

func (d *Database) GetRepositoriesInWorkspace(workspaceID uint) ([]Repository, error) {
	var repositories []Repository
	err := d.Where("workspace_id = ?", workspaceID).
		Preload("Owner").
		Preload("Tags").
		Order("created_at desc").
		Find(&repositories).
		Error
	return repositories, err
}

// FindRepositorySchemaCache finds a repository schema cache by repository ID, path, and ref.
func (d *Database) FindRepositorySchemaCache(repositoryID uint, path, ref string) (*RepositorySchemaCache, error) {
	var schemaCache RepositorySchemaCache
	if err := d.Where("repository_id = ? AND path = ? AND ref = ?", repositoryID, path, ref).First(&schemaCache).Error; err != nil {
		return nil, err
	}
	return &schemaCache, nil
}
