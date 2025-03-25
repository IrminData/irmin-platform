package db

import (
	"time"

	"gorm.io/gorm"
)

type StoredQuery struct {
	gorm.Model
	Name        string    `json:"name"`
	Description string    `json:"description"`
	SQL         string    `json:"sql"`
	Owner       User      `json:"owner" gorm:"foreignKey:OwnerID"`
	OwnerID     uint      `json:"owner_id"`
	Workspace   Workspace `json:"workspace" gorm:"foreignKey:WorkspaceID"`
	WorkspaceID uint      `json:"workspace_id"`
}

type StoredQueryResponse struct {
	ID          string       `json:"id"`
	Name        string       `json:"name"`
	Description string       `json:"description"`
	SQL         string       `json:"sql"`
	Owner       UserResponse `json:"owner"`
	CreatedAt   time.Time    `json:"created_at"`
	UpdatedAt   time.Time    `json:"updated_at"`
}

func GetStoredQueryByID(id uint) (*StoredQuery, error) {
	var query StoredQuery
	if err := DB.Preload("Owner").Preload("Workspace").First(&query, id).Error; err != nil {
		return nil, err
	}
	return &query, nil
}

func GetStoredQueriesByWorkspaceID(workspaceID uint) ([]StoredQuery, error) {
	var queries []StoredQuery
	if err := DB.Preload("Owner").Preload("Workspace").Where("workspace_id = ?", workspaceID).Find(&queries).Error; err != nil {
		return nil, err
	}
	return queries, nil
}

func CreateStoredQuery(query *StoredQuery) (*StoredQuery, error) {
	if err := DB.Create(query).Error; err != nil {
		return nil, err
	}
	if err := DB.Preload("Owner").Preload("Workspace").First(&query, query.ID).Error; err != nil {
		return nil, err
	}
	return query, nil
}

func UpdateStoredQuery(id uint, updates map[string]any) (*StoredQuery, error) {
	var query StoredQuery
	if err := DB.Model(&StoredQuery{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	if err := DB.Preload("Owner").Preload("Workspace").First(&query, id).Error; err != nil {
		return nil, err
	}
	return &query, nil
}

func DeleteStoredQuery(id uint) error {
	if err := DB.Delete(&StoredQuery{}, id).Error; err != nil {
		return err
	}
	return nil
}
