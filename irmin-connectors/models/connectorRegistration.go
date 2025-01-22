package connectorModels

import (
	"gorm.io/gorm"
)

// ConnectorRegistration represents a record associating a system token with a connector.
type ConnectorRegistration struct {
	gorm.Model

	IrminID       string `json:"irminID" gorm:"type:varchar(255);not null"`
	ConnectorName string `json:"connectorName" gorm:"not null"`
	SystemToken   string `json:"systemToken" gorm:"type:varchar(255);not null"`
}
