package db

import "gorm.io/gorm"

type APIToken struct {
	gorm.Model

	Name        string    `json:"name"`
	Token       string    `json:"token"`
	Expiry      string    `json:"expiry"`
	Workspace   Workspace `json:"workspace" gorm:"foreignKey:WorkspaceID"`
	WorkspaceID uint      `json:"workspace_id"`
	User        User      `json:"user" gorm:"foreignKey:UserID"`
	UserID      uint      `json:"user_id"`
}
