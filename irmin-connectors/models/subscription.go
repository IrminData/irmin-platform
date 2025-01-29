package connectorModels

import (
	"gorm.io/gorm"
)

// Subscription represents a record of an active subscription to changes in data.
type Subscription struct {
	gorm.Model

	SubscriptionType   string `json:"subscriptionType" gorm:"type:varchar(255);not null"`
	WebhookUrl         string `json:"webhookUrl" gorm:"type:varchar(255);not null"`
	WebhookAccessToken string `json:"webhookAccessToken" gorm:"type:varchar(255);not null"`

	ConnectionDetails  string `json:"connectionDetails" gorm:"type:text;not null"`
	ConnectionSettings string `json:"connectionSettings" gorm:"type:text;not null"`

	ConnectorRegistrationID uint                   `json:"connectorRegistrationID"`
	Connector               *ConnectorRegistration `json:"connectorRegistration,omitempty" gorm:"foreignKey:ConnectorRegistrationID"`
	OperationID             uint                   `json:"operationID"`
	Operation               *Operation             `json:"operation,omitempty" gorm:"foreignKey:OperationID"`
}
