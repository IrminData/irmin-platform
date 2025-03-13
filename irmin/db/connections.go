package db

import "gorm.io/gorm"

type CustomFieldValues map[string]string

type Connection struct {
	gorm.Model

	Name          string            `json:"name,omitempty"`
	Description   string            `json:"description,omitempty"`
	Documentation string            `json:"documentation,omitempty"`
	Details       CustomFieldValues `json:"details,omitempty" gorm:"type:jsonb;serializer:json"`
	Settings      CustomFieldValues `json:"settings,omitempty" gorm:"type:jsonb;serializer:json"`
	OwnerID       uint              `json:"owner_id,omitempty"`
	Owner         User              `json:"owner,omitempty" gorm:"foreignKey:OwnerID"`
	WorkspaceID   uint              `json:"workspace_id,omitempty"`
	Workspace     Workspace         `json:"workspace,omitempty" gorm:"foreignKey:WorkspaceID"`
	ConnectorID   uint              `json:"connector_id,omitempty"`
	Connector     Connector         `json:"connector,omitempty" gorm:"foreignKey:ConnectorID"`
}
