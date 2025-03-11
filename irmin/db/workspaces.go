package db

import "gorm.io/gorm"

type Workspace struct {
	gorm.Model

	Name        string          `json:"name"`
	Slug        string          `json:"slug"`
	Description string          `json:"description"`
	OwnerID     uint            `json:"owner_id"`
	Owner       User            `json:"owner" gorm:"foreignKey:OwnerID"`
	Users       []WorkspaceUser `json:"users" gorm:"foreignKey:WorkspaceID"`
}
