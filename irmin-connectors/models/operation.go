package connectorModels

import (
	"gorm.io/gorm"
)

// Operation represents a record of an initiated operation tied to a connector.
type Operation struct {
	gorm.Model

	Token string `json:"token" gorm:"type:varchar(255);not null"`

	ConnectorRegistrationID int                    `json:"connectorRegistrationID"`
	Connector               *ConnectorRegistration `json:"connectorRegistration,omitempty" gorm:"foreignKey:ConnectorRegistrationID"`
}
