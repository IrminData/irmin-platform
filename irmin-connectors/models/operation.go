package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Operation represents a record of an initiated operation tied to a connector.
type Operation struct {
	ID        string    `json:"id"        gorm:"primaryKey"`
	Token     string    `json:"token"`
	CreatedAt time.Time `json:"createdAt" gorm:"autoCreateTime"`

	ConnectorID string         `json:"connectorId"`
	Connector   *ConnectorInfo `json:"connector,omitempty" gorm:"foreignKey:ConnectorID"`
}

// Generate a custom string ID before creating the record.
func (o *Operation) BeforeCreate(tx *gorm.DB) (err error) {
	if o.ID == "" { // Only generate an ID if it wasn't already set
		id := uuid.NewString()
		o.ID = id
	}
	return nil
}
