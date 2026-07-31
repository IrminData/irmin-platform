package db

import (
	"errors"
	"fmt"

	"gorm.io/gorm"
)

// ErrConnectorRegistrationNotFound is returned when no connector registration is found
var ErrConnectorRegistrationNotFound = errors.New("connector registration not found")

// ConnectorRegistration represents a record associating a system token with a connector.
type ConnectorRegistration struct {
	gorm.Model

	IrminID       string `json:"irminID"       gorm:"type:varchar(255);not null"`
	ConnectorName string `json:"connectorName" gorm:"not null"`
	SystemToken   string `json:"systemToken"   gorm:"type:varchar(255);not null"`
}

// CreateConnectorRegistration inserts a new ConnectorRegistration record into the database.
func (d *Database) CreateConnectorRegistration(registration *ConnectorRegistration) (*ConnectorRegistration, error) {
	if err := d.Create(registration).Error; err != nil {
		return nil, fmt.Errorf("failed to create connector registration record: %w", err)
	}
	return registration, nil
}

// GetAllConnectorRegistrations retrieves all ConnectorRegistration records from the database.
func (d *Database) GetAllConnectorRegistrations() ([]ConnectorRegistration, error) {
	var registrations []ConnectorRegistration
	if err := d.Find(&registrations).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch connector registrations: %w", err)
	}
	return registrations, nil
}

// GetConnectorRegistrationByID retrieves a ConnectorRegistration record from the database by ID.
// This includes soft-deleted connector registrations.
func (d *Database) GetConnectorRegistrationByID(id uint) (*ConnectorRegistration, error) {
	var registration ConnectorRegistration
	if err := d.Unscoped().First(&registration, id).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch connector registration: %w", err)
	}
	return &registration, nil
}

// GetConnectorRegistrationByConnectorName retrieves a ConnectorRegistration record from the database by the name of the connector.
func (d *Database) GetConnectorRegistrationByConnectorName(name string) (*ConnectorRegistration, error) {
	var registration ConnectorRegistration
	if err := d.Where(&ConnectorRegistration{ConnectorName: name}).First(&registration).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrConnectorRegistrationNotFound
		}
		return nil, fmt.Errorf("failed to fetch connector registration: %w", err)
	}
	return &registration, nil
}

// GetConnectorRegistrationsByConnectorName retrieves all ConnectorRegistration records from the database by the name of the connector.
func (d *Database) GetConnectorRegistrationsByConnectorName(name string) ([]ConnectorRegistration, error) {
	var registrations []ConnectorRegistration
	if err := d.Where(&ConnectorRegistration{ConnectorName: name}).Find(&registrations).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch connector registrations: %w", err)
	}
	return registrations, nil
}

// DeleteConnectorRegistration removes the record with the specified ID from the database.
func (d *Database) DeleteConnectorRegistration(id uint) error {
	if err := d.Delete(&ConnectorRegistration{}, id).Error; err != nil {
		return fmt.Errorf("failed to delete connector registration: %w", err)
	}
	return nil
}
