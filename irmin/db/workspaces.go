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
	OwnerID     uint            `json:"owner_id"`
	Users       []WorkspaceUser `json:"users"       gorm:"foreignKey:WorkspaceID"`
}

// GetWorkspaceBySlug retrieves a workspace by its slug.
func (d *Database) GetWorkspaceBySlug(slug string) (*Workspace, error) {
	var w Workspace
	if err := d.Preload("Owner").Preload("Users.User").Where("slug = ?", slug).First(&w).Error; err != nil {
		return nil, err
	}
	return &w, nil
}

// CreateWorkspace creates a new workspace.
func (d *Database) CreateWorkspace(workspace *Workspace) (*Workspace, error) {
	if err := d.Create(&workspace).Error; err != nil {
		return nil, err
	}
	return workspace, nil
}

// UpdateWorkspace updates an existing workspace record in the database.
func (d *Database) UpdateWorkspace(id uint, updates map[string]any) (*Workspace, error) {
	var workspace Workspace
	// Update only the provided fields for the user with the specified ID.
	if err := d.Model(&Workspace{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	// Retrieve the updated workspace record.
	if err := d.Preload("Owner").First(&workspace, id).Error; err != nil {
		return nil, err
	}
	return &workspace, nil
}

// DeleteWorkspace deletes a workspace and the related records.
func (d *Database) DeleteWorkspace(id uint) error {
	return d.Transaction(func(tx *gorm.DB) error {
		// Delete the workspace.
		if err := tx.Delete(&Workspace{}, id).Error; err != nil {
			return err
		}
		// Delete the workspace users.
		if err := tx.Delete(&WorkspaceUser{}, "workspace_id = ?", id).Error; err != nil {
			return err
		}
		// Delete the workflows
		if err := tx.Delete(&Workflow{}, "workspace_id = ?", id).Error; err != nil {
			return err
		}
		// Delete the connections
		if err := tx.Delete(&Connection{}, "workspace_id = ?", id).Error; err != nil {
			return err
		}
		// Delete the repositories
		if err := tx.Delete(&Repository{}, "workspace_id = ?", id).Error; err != nil {
			return err
		}
		return nil
	})
}
