package db

import "gorm.io/gorm"

type Repository struct {
	gorm.Model

	Name          string    `json:"name"`
	Slug          string    `json:"slug"`
	Description   string    `json:"description"`
	Documentation string    `json:"documentation"`
	IsImmutable   bool      `json:"is_immutable"`
	DefaultBranch string    `json:"default_branch"`
	Workspace     Workspace `json:"workspace" gorm:"foreignKey:WorkspaceID"`
	WorkspaceID   uint      `json:"workspace_id"`
	Owner         User      `json:"owner" gorm:"foreignKey:OwnerID"`
	OwnerID       uint      `json:"owner_id"`
}
