package db

import "gorm.io/gorm"

type Role struct {
	gorm.Model

	Description    string          `json:"description"`
	Label          string          `json:"label"`
	Name           string          `json:"name"` // Slug of the role, e.g., 'admin', 'editor', 'billing', 'viewer', etc.
	WorkspaceUsers []WorkspaceUser `json:"workspace_users" gorm:"many2many:workspace_user_roles;"`
}
