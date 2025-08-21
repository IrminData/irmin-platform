package db

import (
	"fmt"

	"gorm.io/gorm"
)

// Subscription represents a record of an active subscription to changes in data.
type Subscription struct {
	gorm.Model

	WebhookURL         string `json:"webhookUrl"         gorm:"type:varchar(255);not null"`
	WebhookAccessToken string `json:"webhookAccessToken" gorm:"type:varchar(255);not null"`

	ConnectorRegistrationID uint                   `json:"connectorRegistrationID"`
	Connector               *ConnectorRegistration `json:"connectorRegistration,omitempty" gorm:"foreignKey:ConnectorRegistrationID"`
	OperationID             uint                   `json:"operationID"`
	Operation               *Operation             `json:"operation,omitempty"             gorm:"foreignKey:OperationID"`
}

// GetAllSubscriptions retrieves all Subscription records from the database.
func (d *Database) GetAllSubscriptions() ([]Subscription, error) {
	var subscriptions []Subscription
	if err := d.Find(&subscriptions).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch subscriptions: %w", err)
	}
	return subscriptions, nil
}

// CreateSubscription inserts a new Subscription record into the database.
func (d *Database) CreateSubscription(subscription *Subscription) (*Subscription, error) {
	if err := d.Create(subscription).Error; err != nil {
		return nil, fmt.Errorf("failed to create subscription record: %w", err)
	}
	return subscription, nil
}

// DeleteSubscriptionsByOperationID removes all subscriptions associated with the specified operation ID.
func (d *Database) DeleteSubscriptionsByOperationID(operationID uint) error {
	if err := d.Where(&Subscription{OperationID: operationID}).Delete(&Subscription{}).Error; err != nil {
		return fmt.Errorf("failed to delete subscriptions: %w", err)
	}
	return nil
}

// DeleteSubscriptionsByConnectorRegistrationID removes all subscriptions associated with the specified connector registration ID.
func (d *Database) DeleteSubscriptionsByConnectorRegistrationID(connectorRegistrationID uint) error {
	if err := d.Where(&Subscription{ConnectorRegistrationID: connectorRegistrationID}).Delete(&Subscription{}).Error; err != nil {
		return fmt.Errorf("failed to delete subscriptions: %w", err)
	}
	return nil
}
