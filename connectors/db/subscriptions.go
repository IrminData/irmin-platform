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

	ConnectorRegistrationID uint                   `json:"connectorRegistrationID"         gorm:"index"`
	Connector               *ConnectorRegistration `json:"connectorRegistration,omitempty" gorm:"foreignKey:ConnectorRegistrationID"`
	OperationID             uint                   `json:"operationID"                     gorm:"index"`
	Operation               *Operation             `json:"operation,omitempty"             gorm:"foreignKey:OperationID"`
}

// GetSubscriptionsByOperationID retrieves all Subscription records for a specific operation.
func (d *Database) GetSubscriptionsByOperationID(operationID uint) ([]Subscription, error) {
	var subscriptions []Subscription
	if err := d.Where(&Subscription{OperationID: operationID}).Find(&subscriptions).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch subscriptions by operation ID: %w", err)
	}
	return subscriptions, nil
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

// GetSubscriptionByID retrieves a Subscription by its ID.
func (d *Database) GetSubscriptionByID(id uint) (*Subscription, error) {
	var subscription Subscription
	if err := d.First(&subscription, id).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch subscription: %w", err)
	}
	return &subscription, nil
}

// DeleteSubscriptionByID removes a subscription by its ID.
func (d *Database) DeleteSubscriptionByID(id uint) error {
	if err := d.Delete(&Subscription{}, id).Error; err != nil {
		return fmt.Errorf("failed to delete subscription: %w", err)
	}
	return nil
}
