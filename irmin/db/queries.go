package db

import (
	"gorm.io/gorm"
)

type StoredQuery struct {
	gorm.Model
	Name        string    `json:"name"`
	Description string    `json:"description"`
	SQL         string    `json:"sql"`
	Owner       User      `json:"owner"        gorm:"foreignKey:OwnerID"`
	OwnerID     uint      `json:"owner_id"`
	Workspace   Workspace `json:"workspace"    gorm:"foreignKey:WorkspaceID"`
	WorkspaceID uint      `json:"workspace_id" gorm:"index"`
}

func (d *Database) GetStoredQueryByID(id uint) (*StoredQuery, error) {
	var query StoredQuery
	if err := d.Preload("Owner").Preload("Workspace").First(&query, id).Error; err != nil {
		return nil, err
	}
	return &query, nil
}

func (d *Database) GetStoredQueriesByWorkspaceID(workspaceID uint) ([]StoredQuery, error) {
	var queries []StoredQuery
	if err := d.Preload("Owner").Preload("Workspace").Where("workspace_id = ?", workspaceID).Order("created_at desc").Find(&queries).Error; err != nil {
		return nil, err
	}
	return queries, nil
}

func (d *Database) DeleteStoredQuery(id uint) error {
	if err := d.Delete(&StoredQuery{}, id).Error; err != nil {
		return err
	}
	return nil
}
