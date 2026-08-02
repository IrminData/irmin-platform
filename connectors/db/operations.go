package db

import (
	"errors"
	"fmt"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// Operation represents a record of an initiated operation tied to a connector.
//
// The legacy `Token` column (varchar(255), the long-lived per-Connection
// credential minted by /operation/init) was retired in Phase 4 and is
// dropped by Migrate(). After Phase 4 the per-job token lives on
// OperationJob.OperationToken; this row carries Details / Settings only,
// keyed on (Connector, ConfigHash) so the worker can read credentials
// without re-parsing them on every Start* request.
type Operation struct {
	gorm.Model

	Details    datatypes.JSON `json:"details"    gorm:"type:json"`
	Settings   datatypes.JSON `json:"settings"   gorm:"type:json"`
	ConfigHash *string        `json:"configHash" gorm:"type:varchar(64);index:idx_connector_config"`

	Logs []OperationLog `json:"logs,omitempty" gorm:"foreignKey:OperationID"`

	ConnectorRegistrationID uint                   `json:"connectorRegistrationID"         gorm:"index:idx_connector_config"`
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
// This includes soft-deleted operations.
func (d *Database) GetOperationByID(id uint) (*Operation, error) {
	var operation Operation
	if err := d.Unscoped().Preload("Logs").First(&operation, id).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch operation: %w", err)
	}
	return &operation, nil
}

// GetOperationsByConnectorRegistrationID retrieves all Operation records from the database by associated connector registration ID.
func (d *Database) GetOperationsByConnectorRegistrationID(id uint) ([]Operation, error) {
	var operations []Operation
	if err := d.Where(&Operation{ConnectorRegistrationID: id}).Find(&operations).Error; err != nil {
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

// FindOperationByConfigHash retrieves an Operation record matching the connector registration ID
// and configuration hash using the main database connection.
func (d *Database) FindOperationByConfigHash(
	connectorRegistrationID uint,
	configHash *string,
) (*Operation, error) {
	return findOperationByConfigHash(d.DB, connectorRegistrationID, configHash)
}

// FindOperationByConfigHashTx retrieves an Operation record matching the connector registration ID
// and configuration hash using the provided transaction context.
// This should be used within transactions to avoid race conditions.
func FindOperationByConfigHashTx(
	tx *gorm.DB,
	connectorRegistrationID uint,
	configHash *string,
) (*Operation, error) {
	return findOperationByConfigHash(tx, connectorRegistrationID, configHash)
}

// findOperationByConfigHash is a helper that works with any *gorm.DB (main DB or transaction).
// This allows it to be used within transactions to avoid race conditions.
func findOperationByConfigHash(
	db *gorm.DB,
	connectorRegistrationID uint,
	configHash *string,
) (*Operation, error) {
	var operation Operation
	err := db.Where(&Operation{
		ConnectorRegistrationID: connectorRegistrationID,
		ConfigHash:              configHash,
	}).Preload("Logs").First(&operation).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, gorm.ErrRecordNotFound
		}
		return nil, fmt.Errorf("failed to fetch operation: %w", err)
	}

	return &operation, nil
}
