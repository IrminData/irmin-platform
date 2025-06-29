package db

import (
	"gorm.io/gorm"
)

type StoredQuery struct {
	gorm.Model
	Name        string    `json:"name"`
	Description string    `json:"description"`
	SQL         string    `json:"sql"`
	Owner       User      `json:"owner"          gorm:"foreignKey:OwnerID"`
	OwnerID     uint      `json:"owner_id"`
	Workspace   Workspace `json:"workspace"      gorm:"foreignKey:WorkspaceID"`
	WorkspaceID uint      `json:"workspace_id"   gorm:"index"`
	Tags        []Tag     `json:"tags,omitempty" gorm:"many2many:query_tags;"`
}

func (d *Database) GetStoredQueryByID(id uint) (*StoredQuery, error) {
	var query StoredQuery
	if err := d.Preload("Owner").Preload("Workspace").Preload("Tags").First(&query, id).Error; err != nil {
		return nil, err
	}
	return &query, nil
}

func (d *Database) GetStoredQueriesByWorkspaceID(workspaceID uint) ([]StoredQuery, error) {
	var queries []StoredQuery
	if err := d.Preload("Owner").Preload("Workspace").Preload("Tags").Where("workspace_id = ?", workspaceID).Order("created_at desc").Find(&queries).Error; err != nil {
		return nil, err
	}
	return queries, nil
}

func (d *Database) DeleteStoredQuery(tx *gorm.DB, id uint) error {
	// Remove tag associations first
	if err := tx.Where("stored_query_id = ?", id).Delete(&QueryTag{}).Error; err != nil {
		return err
	}
	// Then delete the query
	if err := tx.Delete(&StoredQuery{}, id).Error; err != nil {
		return err
	}

	return nil
}
