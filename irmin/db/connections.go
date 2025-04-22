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

// GetConnectionByID finds a connection by its ID
func GetConnectionByID(id uint) (*Connection, error) {
	var connection Connection
	if err := DB.Preload("Owner").Preload("Connector").First(&connection, id).Error; err != nil {
		return nil, err
	}
	return &connection, nil
}

// GetConnectionsByWorkspaceID finds all connections in a workspace
func GetConnectionsByWorkspaceID(workspaceID uint) ([]Connection, error) {
	var connections []Connection
	if err := DB.Preload("Owner").Preload("Connector").Where("workspace_id = ?", workspaceID).Order("created_at desc").Find(&connections).Error; err != nil {
		return nil, err
	}
	return connections, nil
}

// CreateConnection creates a new connection
func CreateConnection(connection *Connection) (*Connection, error) {
	if err := DB.Create(connection).Error; err != nil {
		return nil, err
	}
	return connection, nil
}

// UpdateConnection updates an existing connection record in the database.
func UpdateConnection(id uint, updates map[string]any) (*Connection, error) {
	var connection Connection
	// Update only the provided fields for the user with the specified ID.
	if err := DB.Model(&Connection{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	// Retrieve the updated connection record.
	if err := DB.Preload("Owner").Preload("Connector").First(&connection, id).Error; err != nil {
		return nil, err
	}
	return &connection, nil
}

// DeleteConnection deletes a connection from the database
func DeleteConnection(id uint) error {
	if err := DB.Delete(&Connection{}, id).Error; err != nil {
		return err
	}
	return nil
}
