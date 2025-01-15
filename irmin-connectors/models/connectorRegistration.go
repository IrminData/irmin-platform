package connectorModels

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ConnectorRegistration represents a record associating a system token with a connector.
type ConnectorRegistration struct {
	ID          string    `json:"id"           gorm:"primaryKey"`
	SystemToken string    `json:"systemToken"`
	CreatedAt   time.Time `json:"createdAt" gorm:"autoCreateTime"`

	ConnectorID string         `json:"connectorId"`
	Connector   *ConnectorInfo `json:"connector,omitempty" gorm:"foreignKey:ConnectorID"`
}

// Generate a custom string ID before creating the record.
func (cr *ConnectorRegistration) BeforeCreate(tx *gorm.DB) (err error) {
	if cr.ID == "" { // Only generate an ID if it wasn't already set
		id := uuid.NewString()
		cr.ID = id
	}
	return nil
}
