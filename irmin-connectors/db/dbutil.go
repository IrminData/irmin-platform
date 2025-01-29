package db

import (
	"fmt"
	"log"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	connectorModels "irmin-connectors/models"
)

// DB is a global handle to the database connection.
var DB *gorm.DB

// InitialiseDB opens (or creates) a SQLite database file, performs any necessary migrations,
// and returns an error if something goes wrong.
func InitialiseDB(path string) error {
	db, err := gorm.Open(sqlite.Open(path), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	// Store the connection globally, or handle as you see fit.
	DB = db

	// Auto-migrate models (which include GORM annotations).
	if err = DB.AutoMigrate(&connectorModels.Operation{}); err != nil {
		return fmt.Errorf("failed to migrate Operation to the db: %w", err)
	}
	if err = DB.AutoMigrate(&connectorModels.ConnectorRegistration{}); err != nil {
		return fmt.Errorf("failed to migrate ConnectorRegistration to the db: %w", err)
	}

	return nil
}

// CreateOperation inserts a new Operation record into the database.
func CreateOperation(operation *connectorModels.Operation) (*connectorModels.Operation, error) {
	if err := DB.Create(operation).Error; err != nil {
		return nil, fmt.Errorf("failed to create operation record: %w", err)
	}
	log.Printf("Created operation with ID: %d\n", operation.ID)
	return operation, nil
}

// CreateConnectorRegistration inserts a new ConnectorRegistration record into the database.
func CreateConnectorRegistration(registration *connectorModels.ConnectorRegistration) (*connectorModels.ConnectorRegistration, error) {
	if err := DB.Create(registration).Error; err != nil {
		return nil, fmt.Errorf("failed to create connector registration record: %w", err)
	}
	log.Printf("Created connector registration with ID: %d\n", registration.ID)
	return registration, nil
}

// GetAllOperations retrieves all Operation records from the database.
func GetAllOperations() ([]connectorModels.Operation, error) {
	var operations []connectorModels.Operation
	if err := DB.Find(&operations).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch operations: %w", err)
	}
	return operations, nil
}

// GetAllConnectorRegistrations retrieves all ConnectorRegistration records from the database.
func GetAllConnectorRegistrations() ([]connectorModels.ConnectorRegistration, error) {
	var registrations []connectorModels.ConnectorRegistration
	if err := DB.Find(&registrations).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch connector registrations: %w", err)
	}
	return registrations, nil
}

// GetOperationByID retrieves an Operation record from the database by ID.
func GetOperationByID(id uint) (*connectorModels.Operation, error) {
	var operation connectorModels.Operation
	if err := DB.First(&operation, id).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch operation: %w", err)
	}
	return &operation, nil
}

// GetConnectorRegistrationByID retrieves a ConnectorRegistration record from the database by ID.
func GetConnectorRegistrationByID(id uint) (*connectorModels.ConnectorRegistration, error) {
	var registration connectorModels.ConnectorRegistration
	if err := DB.First(&registration, id).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch connector registration: %w", err)
	}
	return &registration, nil
}

// GetOperationsByID retrieves an Operation record from the database by associated connector registration ID.
func GetOperationsByConnectorRegistrationID(id uint) ([]connectorModels.Operation, error) {
	var operations []connectorModels.Operation
	if err := DB.Where("connector_registration_id = ?", id).Find(&operations).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch operations: %w", err)
	}
	return operations, nil
}

// GetConnectorRegistrationByConnectorName retrieves a ConnectorRegistration record from the database by the name of the connector.
func GetConnectorRegistrationByConnectorName(name string) ([]connectorModels.ConnectorRegistration, error) {
	var registrations []connectorModels.ConnectorRegistration
	if err := DB.Where("connector_name = ?", name).Find(&registrations).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch connector registration: %w", err)
	}
	return registrations, nil
}

// DeleteOperation removes the record with the specified ID from the database.
func DeleteOperation(id uint) error {
	if err := DB.Delete(&connectorModels.Operation{}, id).Error; err != nil {
		return fmt.Errorf("failed to delete operation: %w", err)
	}
	return nil
}

// DeleteConnectorRegistration removes the record with the specified ID from the database.
func DeleteConnectorRegistration(id uint) error {
	if err := DB.Delete(&connectorModels.ConnectorRegistration{}, id).Error; err != nil {
		return fmt.Errorf("failed to delete connector registration: %w", err)
	}
	return nil
}

// RunRawQuery can be used to execute a raw SQL query against the database.
func RunRawQuery(sqlQuery string, args ...interface{}) error {
	if err := DB.Exec(sqlQuery, args...).Error; err != nil {
		return fmt.Errorf("failed to execute raw query: %w", err)
	}
	return nil
}

// CreateSubscription inserts a new Subscription record into the database.
func CreateSubscription(subscription *connectorModels.Subscription) (*connectorModels.Subscription, error) {
	if err := DB.Create(subscription).Error; err != nil {
		return nil, fmt.Errorf("failed to create subscription record: %w", err)
	}
	log.Printf("Created subscription with ID: %d\n", subscription.ID)
	return subscription, nil
}

// DeleteSubscriptionsByOperationID removes all subscriptions associated with the specified operation ID.
func DeleteSubscriptionsByOperationID(operationID uint) error {
	if err := DB.Where("operation_id = ?", operationID).Delete(&connectorModels.Subscription{}).Error; err != nil {
		return fmt.Errorf("failed to delete subscriptions: %w", err)
	}
	return nil
}

// DeleteSubscriptionsByConnectorRegistrationID removes all subscriptions associated with the specified connector registration ID.
func DeleteSubscriptionsByConnectorRegistrationID(connectorRegistrationID uint) error {
	if err := DB.Where("connector_registration_id = ?", connectorRegistrationID).Delete(&connectorModels.Subscription{}).Error; err != nil {
		return fmt.Errorf("failed to delete subscriptions: %w", err)
	}
	return nil
}
