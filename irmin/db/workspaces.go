package db

import (
	"gorm.io/gorm"
)

type Workspace struct {
	gorm.Model

	Name        string          `json:"name"`
	Slug        string          `json:"slug"        gorm:"uniqueIndex"`
	Description string          `json:"description"`
	Owner       User            `json:"owner"       gorm:"foreignKey:OwnerID"`
	OwnerID     uint            `json:"owner_id"    gorm:"index"`
	Users       []WorkspaceUser `json:"users"       gorm:"foreignKey:WorkspaceID"`
	Policies    []Policy        `json:"policies"    gorm:"foreignKey:WorkspaceID"`
}

// GetAllWorkspaces retrieves all workspaces from the database.
func (d *Database) GetAllWorkspaces() ([]Workspace, error) {
	var workspaces []Workspace
	if err := d.Find(&workspaces).Error; err != nil {
		return nil, err
	}
	return workspaces, nil
}

// GetWorkspaceBySlug retrieves a workspace by its slug.
func (d *Database) GetWorkspaceBySlug(slug string) (*Workspace, error) {
	var w Workspace
	if err := d.Preload("Owner").Preload("Users.User").Where(&Workspace{Slug: slug}).First(&w).Error; err != nil {
		return nil, err
	}
	return &w, nil
}

// DeleteWorkspace deletes a workspace and the related records.
func (d *Database) DeleteWorkspace(id uint, tx *gorm.DB) error {
	// Delete the workspace.
	if err := tx.Delete(&Workspace{}, id).Error; err != nil {
		return err
	}
	// Delete the workspace users.
	if err := tx.Delete(&WorkspaceUser{}, &WorkspaceUser{WorkspaceID: id}).Error; err != nil {
		return err
	}
	// Delete the workflows
	if err := tx.Delete(&Workflow{}, &Workflow{WorkspaceID: id}).Error; err != nil {
		return err
	}
	// Delete the connections
	if err := tx.Delete(&Connection{}, &Connection{WorkspaceID: id}).Error; err != nil {
		return err
	}
	// Delete the repositories
	if err := tx.Delete(&Repository{}, &Repository{WorkspaceID: id}).Error; err != nil {
		return err
	}
	return nil
}
