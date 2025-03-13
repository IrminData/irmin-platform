package db

import "gorm.io/gorm"

type Workspace struct {
	gorm.Model

	Name        string          `json:"name"`
	Slug        string          `json:"slug" gorm:"uniqueIndex"`
	Description string          `json:"description"`
	Owner       User            `json:"owner" gorm:"foreignKey:OwnerID"`
	OwnerID     uint            `json:"owner_id"`
	Users       []WorkspaceUser `json:"users" gorm:"foreignKey:WorkspaceID"`
}

type WorkspaceResponse struct {
	ID          string         `json:"id"`
	Name        string         `json:"name"`
	Slug        string         `json:"slug"`
	Description string         `json:"description"`
	Owner       *UserResponse  `json:"owner,omitempty"`
	Users       []UserResponse `json:"users,omitempty"`
}

// GetWorkspaceBySlug retrieves a workspace by its slug.
func GetWorkspaceBySlug(slug string) (*Workspace, error) {
	var w Workspace
	if err := DB.Preload("Owner").Preload("Users.User").Where("slug = ?", slug).First(&w).Error; err != nil {
		return nil, err
	}
	return &w, nil
}

// CreateWorkspace creates a new workspace.
func CreateWorkspace(workspace *Workspace) (*Workspace, error) {
	if err := DB.Create(&workspace).Error; err != nil {
		return nil, err
	}
	return workspace, nil
}

// UpdateWorkspace updates an existing workspace record in the database.
func UpdateWorkspace(id uint, updates interface{}) (*Workspace, error) {
	var workspace Workspace
	// Update only the provided fields for the user with the specified ID.
	if err := DB.Model(&Workspace{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	// Retrieve the updated workspace record.
	if err := DB.Preload("Owner").First(&workspace, id).Error; err != nil {
		return nil, err
	}
	return &workspace, nil
}

// DeleteWorkspace deletes a workspace.
func DeleteWorkspace(id uint) error {
	return DB.Where("id = ?", id).Delete(&Workspace{}).Error
}
