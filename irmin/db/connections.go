package db

import "gorm.io/gorm"

type Connection struct {
	gorm.Model

	Name          string            `json:"name,omitempty"`
	Description   string            `json:"description,omitempty"`
	Documentation string            `json:"documentation,omitempty"`
	Details       map[string]string `json:"details,omitempty" gorm:"type:jsonb"`
	Settings      map[string]string `json:"settings,omitempty" gorm:"type:jsonb"`
	OwnerID       uint              `json:"owner_id,omitempty"`
	Owner         User              `json:"owner,omitempty" gorm:"foreignKey:OwnerID"`
	WorkspaceID   uint              `json:"workspace_id,omitempty"`
	Workspace     Workspace         `json:"workspace,omitempty" gorm:"foreignKey:WorkspaceID"`
	ConnectorID   uint              `json:"connector_id,omitempty"`
	Connector     Connector         `json:"connector,omitempty" gorm:"foreignKey:ConnectorID"`
}
