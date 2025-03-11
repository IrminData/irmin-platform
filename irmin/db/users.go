package db

import "gorm.io/gorm"

type User struct {
	gorm.Model

	ClerkID            string          `json:"clerk_id"`
	FirstName          string          `json:"first_name"`
	LastName           string          `json:"last_name"`
	Email              string          `json:"email"`
	Phone              string          `json:"phone"`
	Company            string          `json:"company"`
	ProfilePicture     string          `json:"profile_picture"`
	Workspaces         []WorkspaceUser `json:"workspaces" gorm:"foreignKey:UserID"`
	CurrentWorkspaceID *uint           `json:"current_workspace_id"`
	CurrentWorkspace   *Workspace      `json:"current_workspace" gorm:"foreignKey:CurrentWorkspaceID"`
}

type WorkspaceUser struct {
	gorm.Model

	UserID      uint      `json:"user_id"`
	User        User      `json:"user" gorm:"foreignKey:UserID"`
	WorkspaceID uint      `json:"workspace_id"`
	Workspace   Workspace `json:"workspace" gorm:"foreignKey:WorkspaceID"`
	Roles       []Role    `json:"roles" gorm:"many2many:workspace_user_roles;"`
}
