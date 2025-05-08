package db

import (
	"fmt"

	"gorm.io/gorm"
)

// ConnectorRegistration represents a record associating a system token with a connector.
type ConnectorRegistration struct {
	gorm.Model

	IrminID       string `json:"irminID"       gorm:"type:varchar(255);not null"`
	ConnectorName string `json:"connectorName" gorm:"not null"`
	SystemToken   string `json:"systemToken"   gorm:"type:varchar(255);not null"`
}

// CreateConnectorRegistration inserts a new ConnectorRegistration record into the database.
func (d *Database) CreateConnectorRegistration(registration *ConnectorRegistration) (*ConnectorRegistration, error) {
	if err := d.db.Create(registration).Error; err != nil {
		return nil, fmt.Errorf("failed to create connector registration record: %w", err)
	}
	return registration, nil
}

// GetAllConnectorRegistrations retrieves all ConnectorRegistration records from the database.
func (d *Database) GetAllConnectorRegistrations() ([]ConnectorRegistration, error) {
	var registrations []ConnectorRegistration
	if err := d.db.Find(&registrations).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch connector registrations: %w", err)
	}
	return registrations, nil
}

// GetConnectorRegistrationByID retrieves a ConnectorRegistration record from the database by ID.
func (d *Database) GetConnectorRegistrationByID(id uint) (*ConnectorRegistration, error) {
	var registration ConnectorRegistration
	if err := d.db.First(&registration, id).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch connector registration: %w", err)
	}
	return &registration, nil
}

// GetConnectorRegistrationByConnectorName retrieves a ConnectorRegistration record from the database by the name of the connector.
func (d *Database) GetConnectorRegistrationByConnectorName(name string) ([]ConnectorRegistration, error) {
	var registrations []ConnectorRegistration
	if err := d.db.Where("connector_name = ?", name).Find(&registrations).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch connector registration: %w", err)
	}
	return registrations, nil
}

// DeleteConnectorRegistration removes the record with the specified ID from the database.
func (d *Database) DeleteConnectorRegistration(id uint) error {
	if err := d.db.Delete(&ConnectorRegistration{}, id).Error; err != nil {
		return fmt.Errorf("failed to delete connector registration: %w", err)
	}
	return nil
}
