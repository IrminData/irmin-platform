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
	RepositoryID uint                      `json:"repository_id,omitempty"`
	Repository   Repository                `json:"repository,omitempty"    gorm:"foreignKey:RepositoryID"`
}

type Repository struct {
	gorm.Model

	Name          string                  `json:"name"`
	LakeFSRepoID  string                  `json:"lakefs_repo_id"`
	Slug          string                  `json:"slug"                   gorm:"uniqueIndex"`
	Description   string                  `json:"description"`
	Documentation string                  `json:"documentation"`
	IsImmutable   bool                    `json:"is_immutable"`
	DefaultBranch string                  `json:"default_branch"`
	Workspace     Workspace               `json:"workspace"              gorm:"foreignKey:WorkspaceID"`
	WorkspaceID   uint                    `json:"workspace_id"`
	Owner         User                    `json:"owner"                  gorm:"foreignKey:OwnerID"`
	OwnerID       uint                    `json:"owner_id"`
	SchemaCache   []RepositorySchemaCache `json:"schema_cache,omitempty" gorm:"foreignKey:RepositoryID"`
}

func (d *Database) GetRepositoryBySlugAndWorkspaceID(slug string, workspaceID uint) (*Repository, error) {
	var repository Repository
	err := d.Where("slug = ? AND workspace_id = ?", slug, workspaceID).Preload("Owner").First(&repository).Error
	return &repository, err
}

func (d *Database) CheckIfRepositoryExists(slug string, workspaceID uint) bool {
	var repository Repository
	d.Where("slug = ? AND workspace_id = ?", slug, workspaceID).Preload("Owner").First(&repository)
	return repository.ID != 0
}

func (d *Database) GetRepositoriesInWorkspace(workspaceID uint) ([]Repository, error) {
	var repositories []Repository
	err := d.Where("workspace_id = ?", workspaceID).Preload("Owner").Order("created_at desc").Find(&repositories).Error
	return repositories, err
}

func (d *Database) CreateRepository(repository *Repository) (*Repository, error) {
	if err := d.Create(repository).Error; err != nil {
		return nil, err
	}
	if err := d.Preload("Owner").First(&repository, repository.ID).Error; err != nil {
		return nil, err
	}
	return repository, nil
}

func (d *Database) UpdateRepository(repository *Repository) (*Repository, error) {
	if err := d.Save(repository).Error; err != nil {
		return nil, err
	}
	if err := d.Preload("Owner").First(&repository, repository.ID).Error; err != nil {
		return nil, err
	}
	return repository, nil
}

func (d *Database) DeleteRepository(id uint) error {
	if err := d.Delete(&Repository{}, id).Error; err != nil {
		return err
	}
	return nil
}

// FindRepositorySchemaCache finds a repository schema cache by repository ID, path, and ref.
func (d *Database) FindRepositorySchemaCache(repositoryID uint, path, ref string) (*RepositorySchemaCache, error) {
	var schemaCache RepositorySchemaCache
	if err := d.Where("repository_id = ? AND path = ? AND ref = ?", repositoryID, path, ref).First(&schemaCache).Error; err != nil {
		return nil, err
	}
	return &schemaCache, nil
}

// SaveRepositorySchemaCache updates or creates a repository schema cache.
func (d *Database) SaveRepositorySchemaCache(schemaCache *RepositorySchemaCache) (*RepositorySchemaCache, error) {
	if err := d.Save(schemaCache).Error; err != nil {
		return nil, err
	}
	if err := d.First(&schemaCache, schemaCache.ID).Error; err != nil {
		return nil, err
	}
	return schemaCache, nil
}
