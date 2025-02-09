package db

import (
	"fmt"
	"log"

	"gorm.io/gorm"
)

// Operation represents a record of an initiated operation tied to a connector.
type Operation struct {
	gorm.Model

	Token string `json:"token" gorm:"type:varchar(255);not null"`

	ConnectorRegistrationID uint                   `json:"connectorRegistrationID"`
	Connector               *ConnectorRegistration `json:"connectorRegistration,omitempty" gorm:"foreignKey:ConnectorRegistrationID"`
}

// CreateOperation inserts a new Operation record into the database.
func CreateOperation(operation *Operation) (*Operation, error) {
	if err := DB.Create(operation).Error; err != nil {
		return nil, fmt.Errorf("failed to create operation record: %w", err)
	}
	log.Printf("Created operation with ID: %d\n", operation.ID)
	return operation, nil
}

// GetAllOperations retrieves all Operation records from the database.
func GetAllOperations() ([]Operation, error) {
	var operations []Operation
	if err := DB.Find(&operations).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch operations: %w", err)
	}
	return operations, nil
}

// GetOperationByID retrieves an Operation record from the database by ID.
func GetOperationByID(id uint) (*Operation, error) {
	var operation Operation
	if err := DB.First(&operation, id).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch operation: %w", err)
	}
	return &operation, nil
}

// GetOperationsByID retrieves an Operation record from the database by associated connector registration ID.
func GetOperationsByConnectorRegistrationID(id uint) ([]Operation, error) {
	var operations []Operation
	if err := DB.Where("connector_registration_id = ?", id).Find(&operations).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch operations: %w", err)
	}
	return operations, nil
}

// DeleteOperation removes the record with the specified ID from the database.
func DeleteOperation(id uint) error {
	if err := DB.Delete(&Operation{}, id).Error; err != nil {
		return fmt.Errorf("failed to delete operation: %w", err)
	}
	return nil
}
