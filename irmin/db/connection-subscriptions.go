package db

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"

	"gorm.io/gorm"
)

// ConnectionSubscription represents a subscription to data changes in a connection.
// When data changes in the external system, the connector sends webhook events
// to the Irmin API using the WebhookToken for authentication.
type ConnectionSubscription struct {
	gorm.Model

	// Name is a user-friendly name for this subscription
	Name string `json:"name"                  gorm:"type:varchar(255)"`
	// Description provides additional context about the subscription
	Description string `json:"description,omitempty" gorm:"type:text"`

	// Connection is the connection this subscription monitors
	Connection   Connection `json:"connection,omitempty" gorm:"foreignKey:ConnectionID"`
	ConnectionID uint       `json:"connection_id"        gorm:"index;not null"`

	// WebhookToken is the secret token used to authenticate webhook requests
	// This should be kept secret and only shared with the connector
	WebhookToken string `json:"-" gorm:"type:varchar(255);not null"`

	// FilterPaths is an optional list of paths to filter events (e.g., ["users", "orders"])
	// If empty, all paths are included
	FilterPaths []string `json:"filter_paths,omitempty" gorm:"type:jsonb;serializer:json"`

	// EventTypes is an optional list of event types to filter (e.g., ["insert", "update"])
	// If empty, all event types are included
	EventTypes []string `json:"event_types,omitempty" gorm:"type:jsonb;serializer:json"`

	// IsActive indicates whether the subscription is currently active
	IsActive bool `json:"is_active" gorm:"default:true"`

	// ConnectorSubscriptionID is the ID of the subscription in the connector service.
	// This is set when the connector supports automatic change detection (patch_event capability).
	// It's used to unsubscribe when the subscription is deleted.
	ConnectorSubscriptionID *uint `json:"connector_subscription_id,omitempty"`

	// Owner is the user who created this subscription
	Owner   *User `json:"owner,omitempty"    gorm:"foreignKey:OwnerID"`
	OwnerID *uint `json:"owner_id,omitempty"`

	// Workspace is the workspace this subscription belongs to (derived from connection)
	Workspace   *Workspace `json:"workspace,omitempty" gorm:"foreignKey:WorkspaceID"`
	WorkspaceID uint       `json:"workspace_id"        gorm:"index;not null"`
}

// webhookTokenBytes is the size in bytes for webhook token generation (256 bits).
const webhookTokenBytes = 32

// GenerateWebhookToken creates a secure random token for webhook authentication.
func GenerateWebhookToken() (string, error) {
	bytes := make([]byte, webhookTokenBytes)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate random token: %w", err)
	}
	return hex.EncodeToString(bytes), nil
}

// GetConnectionSubscriptionByID retrieves a subscription by its ID.
func (d *Database) GetConnectionSubscriptionByID(id uint) (*ConnectionSubscription, error) {
	var subscription ConnectionSubscription
	if err := d.Preload("Connection").
		Preload("Connection.Connector").
		Preload("Owner").
		First(&subscription, id).Error; err != nil {
		return nil, err
	}
	return &subscription, nil
}

// GetConnectionSubscriptionsByConnectionID retrieves all subscriptions for a connection.
func (d *Database) GetConnectionSubscriptionsByConnectionID(connectionID uint) ([]ConnectionSubscription, error) {
	var subscriptions []ConnectionSubscription
	if err := d.Where(&ConnectionSubscription{ConnectionID: connectionID}).
		Preload("Connection").
		Preload("Owner").
		Find(&subscriptions).Error; err != nil {
		return nil, err
	}
	return subscriptions, nil
}

// CreateConnectionSubscription creates a new subscription in the database.
// It automatically generates a webhook token if not provided.
func (d *Database) CreateConnectionSubscription(subscription *ConnectionSubscription) error {
	// Generate webhook token if not set
	if subscription.WebhookToken == "" {
		token, err := GenerateWebhookToken()
		if err != nil {
			return err
		}
		subscription.WebhookToken = token
	}

	return d.Create(subscription).Error
}

// UpdateConnectionSubscription updates an existing subscription.
func (d *Database) UpdateConnectionSubscription(subscription *ConnectionSubscription) error {
	return d.Save(subscription).Error
}

// DeleteConnectionSubscription deletes a subscription by ID.
func (d *Database) DeleteConnectionSubscription(id uint) error {
	return d.Delete(&ConnectionSubscription{}, id).Error
}

// DeleteConnectionSubscriptionsByConnectionID deletes all subscriptions for a connection.
func (d *Database) DeleteConnectionSubscriptionsByConnectionID(connectionID uint) error {
	return d.Where(&ConnectionSubscription{ConnectionID: connectionID}).
		Delete(&ConnectionSubscription{}).Error
}
