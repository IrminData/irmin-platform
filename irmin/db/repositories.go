package db

import (
	"gorm.io/gorm"
)

type Repository struct {
	gorm.Model

	Name          string    `json:"name"`
	Slug          string    `json:"slug" gorm:"uniqueIndex"`
	Description   string    `json:"description"`
	Documentation string    `json:"documentation"`
	IsImmutable   bool      `json:"is_immutable"`
	DefaultBranch string    `json:"default_branch"`
	Workspace     Workspace `json:"workspace" gorm:"foreignKey:WorkspaceID"`
	WorkspaceID   uint      `json:"workspace_id"`
	Owner         User      `json:"owner" gorm:"foreignKey:OwnerID"`
	OwnerID       uint      `json:"owner_id"`
}

func GetRepositoryBySlugAndWorkspaceID(slug string, workspaceID uint) (*Repository, error) {
	var repository Repository
	err := DB.Where("slug = ? AND workspace_id = ?", slug, workspaceID).Preload("Owner").First(&repository).Error
	return &repository, err
}

func CheckIfRepositoryExists(slug string, workspaceID uint) bool {
	var repository Repository
	DB.Where("slug = ? AND workspace_id = ?", slug, workspaceID).Preload("Owner").First(&repository)
	return repository.ID != 0
}

func GetRepositoriesInWorkspace(workspaceID uint) ([]Repository, error) {
	var repositories []Repository
	err := DB.Where("workspace_id = ?", workspaceID).Preload("Owner").Find(&repositories).Error
	return repositories, err
}

func CreateRepository(repository *Repository) (*Repository, error) {
	if err := DB.Create(repository).Error; err != nil {
		return nil, err
	}
	if err := DB.Preload("Owner").First(&repository, repository.ID).Error; err != nil {
		return nil, err
	}
	return repository, nil
}

func UpdateRepository(id uint, updates map[string]any) (*Repository, error) {
	var repository Repository
	if err := DB.Model(&Repository{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	if err := DB.First(&repository, id).Error; err != nil {
		return nil, err
	}
	return &repository, nil
}

func DeleteRepository(id uint) error {
	if err := DB.Delete(&Repository{}, id).Error; err != nil {
		return err
	}
	return nil
}
