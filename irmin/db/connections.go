package db

import (
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"gorm.io/gorm"
)

type CustomFieldValues map[string]string

type ConnectionSchemaCache struct {
	gorm.Model

	Schema       *irminmodels.ObjectSchema `json:"schema,omitempty"        gorm:"type:jsonb;serializer:json"`
	OpMethod     *string                   `json:"op_method,omitempty"`
	ConnectionID uint                      `json:"connection_id,omitempty" gorm:"index"`
	Connection   Connection                `json:"connection"              gorm:"foreignKey:ConnectionID"`
}

type Connection struct {
	gorm.Model

	Name          string                  `json:"name,omitempty"`
	Description   string                  `json:"description,omitempty"`
	Documentation string                  `json:"documentation,omitempty"`
	Details       CustomFieldValues       `json:"details,omitempty"       gorm:"type:jsonb;serializer:encrypted_json"`
	Settings      CustomFieldValues       `json:"settings,omitempty"      gorm:"type:jsonb;serializer:json"`
	OwnerID       uint                    `json:"owner_id,omitempty"`
	Owner         User                    `json:"owner"                   gorm:"foreignKey:OwnerID"`
	WorkspaceID   uint                    `json:"workspace_id,omitempty"  gorm:"index"`
	Workspace     Workspace               `json:"workspace"               gorm:"foreignKey:WorkspaceID"`
	ConnectorID   uint                    `json:"connector_id,omitempty"`
	Connector     Connector               `json:"connector"               gorm:"foreignKey:ConnectorID"`
	SchemaCache   []ConnectionSchemaCache `json:"schema_cache,omitempty"  gorm:"foreignKey:ConnectionID"`
	Tags          []Tag                   `json:"tags,omitempty"          gorm:"many2many:connection_tags;"`
}

// GetConnectionByID finds a connection by its ID.
func (d *Database) GetConnectionByID(id uint) (*Connection, error) {
	var connection Connection
	if err := d.Preload("Owner").Preload("Connector").Preload("Tags").First(&connection, id).Error; err != nil {
		return nil, err
	}
	return &connection, nil
}

// GetConnectionByIDAndWorkspaceID finds a connection by its ID and verifies it belongs to the given workspace.
func (d *Database) GetConnectionByIDAndWorkspaceID(id uint, workspaceID uint) (*Connection, error) {
	var connection Connection
	if err := d.Preload("Owner").Preload("Connector").Preload("Tags").
		Where(&Connection{WorkspaceID: workspaceID}).
		First(&connection, id).Error; err != nil {
		return nil, err
	}
	return &connection, nil
}

// GetConnectionsByWorkspaceID finds all connections in a workspace.
func (d *Database) GetConnectionsByWorkspaceID(workspaceID uint) ([]Connection, error) {
	var connections []Connection
	if err := d.Preload("Owner").Preload("Connector").Preload("Tags").Where(&Connection{WorkspaceID: workspaceID}).Order("created_at desc").Find(&connections).Error; err != nil {
		return nil, err
	}
	return connections, nil
}

// DeleteConnection deletes a connection and its associated data from the database.
func (d *Database) DeleteConnection(tx *gorm.DB, id uint) error {
	// Remove tag associations first
	if err := tx.Where(&ConnectionTag{ConnectionID: id}).Delete(&ConnectionTag{}).Error; err != nil {
		return err
	}
	// Delete associated schema cache
	if err := tx.Where(&ConnectionSchemaCache{ConnectionID: id}).Delete(&ConnectionSchemaCache{}).Error; err != nil {
		return err
	}
	// Delete associated subscriptions
	if err := tx.Where(&ConnectionSubscription{ConnectionID: id}).Delete(&ConnectionSubscription{}).Error; err != nil {
		return err
	}
	// Delete OAuth artifacts via the same helpers the disconnect path uses,
	// so the two "wipe this connection's OAuth state" call sites stay in
	// lockstep. A stale session left behind after delete could be abused
	// by a late callback to re-create tokens against an orphan connection.
	if err := d.DeleteConnectionOAuthTokenByConnectionID(tx, id); err != nil {
		return err
	}
	if err := d.DeleteConnectionOAuthSessionsByConnectionID(tx, id); err != nil {
		return err
	}
	// Then delete the connection
	if err := tx.Delete(&Connection{}, id).Error; err != nil {
		return err
	}
	return nil
}

// FindConnectionSchemaCache finds a connection schema cache by connection ID and op method.
func (d *Database) FindConnectionSchemaCache(connectionID uint, opMethod string) (*ConnectionSchemaCache, error) {
	var schemaCache ConnectionSchemaCache
	if err := d.Where(&ConnectionSchemaCache{ConnectionID: connectionID, OpMethod: &opMethod}).First(&schemaCache).Error; err != nil {
		return nil, err
	}
	return &schemaCache, nil
}
