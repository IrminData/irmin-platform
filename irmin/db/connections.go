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
func (d *Database) GetConnectionByID(id uint) (*Connection, error) {
	var connection Connection
	if err := d.Preload("Owner").Preload("Connector").First(&connection, id).Error; err != nil {
		return nil, err
	}
	return &connection, nil
}

// GetConnectionsByWorkspaceID finds all connections in a workspace.
func (d *Database) GetConnectionsByWorkspaceID(workspaceID uint) ([]Connection, error) {
	var connections []Connection
	if err := d.Preload("Owner").Preload("Connector").Where("workspace_id = ?", workspaceID).Order("created_at desc").Find(&connections).Error; err != nil {
		return nil, err
	}
	return connections, nil
}

// DeleteConnection deletes a connection and its associated schema cache from the database.
func (d *Database) DeleteConnection(id uint) error {
	return d.Transaction(func(tx *gorm.DB) error {
		// Delete associated schema cache first
		if err := tx.Where("connection_id = ?", id).Delete(&ConnectionSchemaCache{}).Error; err != nil {
			return err
		}
		// Then delete the connection
		if err := tx.Delete(&Connection{}, id).Error; err != nil {
			return err
		}
		return nil
	})
}

// FindConnectionSchemaCache finds a connection schema cache by connection ID and op method.
func (d *Database) FindConnectionSchemaCache(connectionID uint, opMethod string) (*ConnectionSchemaCache, error) {
	var schemaCache ConnectionSchemaCache
	if err := d.Where("connection_id = ? AND op_method = ?", connectionID, opMethod).First(&schemaCache).Error; err != nil {
		return nil, err
	}
	return &schemaCache, nil
}
