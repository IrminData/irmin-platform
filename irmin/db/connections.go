package db

import (
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

type CustomFieldValues map[string]string

type ConnectionSchemaCache struct {
	gorm.Model

	Schema       *irminmodels.ObjectSchema `json:"schema,omitempty"        gorm:"type:jsonb;serializer:json"`
	OpMethod     *string                   `json:"op_method,omitempty"`
	ConnectionID uint                      `json:"connection_id,omitempty"`
	Connection   Connection                `json:"connection,omitempty"    gorm:"foreignKey:ConnectionID"`
}

type Connection struct {
	gorm.Model

	Name          string                  `json:"name,omitempty"`
	Description   string                  `json:"description,omitempty"`
	Documentation string                  `json:"documentation,omitempty"`
	Details       CustomFieldValues       `json:"details,omitempty"       gorm:"type:jsonb;serializer:json"`
	Settings      CustomFieldValues       `json:"settings,omitempty"      gorm:"type:jsonb;serializer:json"`
	OwnerID       uint                    `json:"owner_id,omitempty"`
	Owner         User                    `json:"owner,omitempty"         gorm:"foreignKey:OwnerID"`
	WorkspaceID   uint                    `json:"workspace_id,omitempty"`
	Workspace     Workspace               `json:"workspace,omitempty"     gorm:"foreignKey:WorkspaceID"`
	ConnectorID   uint                    `json:"connector_id,omitempty"`
	Connector     Connector               `json:"connector,omitempty"     gorm:"foreignKey:ConnectorID"`
	SchemaCache   []ConnectionSchemaCache `json:"schema_cache,omitempty"  gorm:"foreignKey:ConnectionID"`
}

// GetConnectionByID finds a connection by its ID.
func GetConnectionByID(id uint) (*Connection, error) {
	var connection Connection
	if err := DB.Preload("Owner").Preload("Connector").First(&connection, id).Error; err != nil {
		return nil, err
	}
	return &connection, nil
}

// GetConnectionsByWorkspaceID finds all connections in a workspace.
func GetConnectionsByWorkspaceID(workspaceID uint) ([]Connection, error) {
	var connections []Connection
	if err := DB.Preload("Owner").Preload("Connector").Where("workspace_id = ?", workspaceID).Order("created_at desc").Find(&connections).Error; err != nil {
		return nil, err
	}
	return connections, nil
}

// CreateConnection creates a new connection.
func CreateConnection(connection *Connection) (*Connection, error) {
	if err := DB.Create(connection).Error; err != nil {
		return nil, err
	}
	return connection, nil
}

// UpdateConnection updates an existing connection record in the database.
func UpdateConnection(connection *Connection) (*Connection, error) {
	if err := DB.Save(&connection).Error; err != nil {
		return nil, err
	}
	if err := DB.Preload("Owner").Preload("Connector").First(&connection, connection.ID).Error; err != nil {
		return nil, err
	}
	return connection, nil
}

// DeleteConnection deletes a connection from the database.
func DeleteConnection(id uint) error {
	if err := DB.Delete(&Connection{}, id).Error; err != nil {
		return err
	}
	return nil
}

// FindConnectionSchemaCache finds a connection schema cache by connection ID and op method.
func FindConnectionSchemaCache(connectionID uint, opMethod string) (*ConnectionSchemaCache, error) {
	var schemaCache ConnectionSchemaCache
	if err := DB.Where("connection_id = ? AND op_method = ?", connectionID, opMethod).First(&schemaCache).Error; err != nil {
		return nil, err
	}
	return &schemaCache, nil
}

// SaveConnectionSchemaCache updates or creates a connection schema cache.
func SaveConnectionSchemaCache(schemaCache *ConnectionSchemaCache) (*ConnectionSchemaCache, error) {
	if err := DB.Save(schemaCache).Error; err != nil {
		return nil, err
	}
	return schemaCache, nil
}
