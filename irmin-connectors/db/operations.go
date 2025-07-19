package db

import (
	"fmt"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Operation represents a record of an initiated operation tied to a connector.
type Operation struct {
	gorm.Model

	Details  datatypes.JSON `json:"details"  gorm:"type:json"`
	Settings datatypes.JSON `json:"settings" gorm:"type:json"`
	Token    string         `json:"token"    gorm:"type:varchar(255);not null"`

	ConnectorRegistrationID uint                   `json:"connectorRegistrationID"`
	Connector               *ConnectorRegistration `json:"connectorRegistration,omitempty" gorm:"foreignKey:ConnectorRegistrationID"`
}

// CreateOperation inserts a new Operation record into the database.
func (d *Database) CreateOperation(operation *Operation) (*Operation, error) {
	if err := d.Create(operation).Error; err != nil {
		return nil, fmt.Errorf("failed to create operation record: %w", err)
	}
	return operation, nil
}

// GetAllOperations retrieves all Operation records from the database.
func (d *Database) GetAllOperations() ([]Operation, error) {
	var operations []Operation
	if err := d.Find(&operations).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch operations: %w", err)
	}
	return operations, nil
}

// GetOperationByID retrieves an Operation record from the database by ID.
func (d *Database) GetOperationByID(id uint) (*Operation, error) {
	var operation Operation
	if err := d.First(&operation, id).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch operation: %w", err)
	}
	return &operation, nil
}

// GetOperationsByConnectorRegistrationID retrieves all Operation records from the database by associated connector registration ID.
func (d *Database) GetOperationsByConnectorRegistrationID(id uint) ([]Operation, error) {
	var operations []Operation
	if err := d.Where("connector_registration_id = ?", id).Find(&operations).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch operations: %w", err)
	}
	return operations, nil
}

// DeleteOperation removes the record with the specified ID from the database.
func (d *Database) DeleteOperation(id uint) error {
	if err := d.Delete(&Operation{}, id).Error; err != nil {
		return fmt.Errorf("failed to delete operation: %w", err)
	}
	return nil
}
