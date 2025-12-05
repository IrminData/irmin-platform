package db

import (
	"gorm.io/gorm"
)

type StoredScript struct {
	gorm.Model
	Name        string    `json:"name"           gorm:"not null"`
	Description string    `json:"description"`
	Content     string    `json:"content"`
	Language    string    `json:"language"`
	Owner       User      `json:"owner"          gorm:"foreignKey:OwnerID"`
	OwnerID     uint      `json:"owner_id"`
	Workspace   Workspace `json:"workspace"      gorm:"foreignKey:WorkspaceID"`
	WorkspaceID uint      `json:"workspace_id"   gorm:"index"`
	Tags        []Tag     `json:"tags,omitempty" gorm:"many2many:script_tags;"`
}

func (d *Database) GetStoredScriptByID(id uint) (*StoredScript, error) {
	var script StoredScript
	if err := d.Preload("Owner").Preload("Workspace").Preload("Tags").First(&script, id).Error; err != nil {
		return nil, err
	}
	return &script, nil
}

func (d *Database) GetStoredScriptsByWorkspaceID(workspaceID uint) ([]StoredScript, error) {
	var scripts []StoredScript
	if err := d.Preload("Owner").Preload("Workspace").Preload("Tags").Where(&StoredScript{WorkspaceID: workspaceID}).Order("created_at desc").Find(&scripts).Error; err != nil {
		return nil, err
	}
	return scripts, nil
}

func (d *Database) DeleteStoredScript(tx *gorm.DB, id uint) error {
	// Remove tag associations first
	if err := tx.Where(&ScriptTag{StoredScriptID: id}).Delete(&ScriptTag{}).Error; err != nil {
		return err
	}
	// Then delete the query
	if err := tx.Delete(&StoredScript{}, id).Error; err != nil {
		return err
	}

	return nil
}
