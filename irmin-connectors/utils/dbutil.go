package dbutil

import (
	"fmt"
	"log"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"irmin-connectors/models"
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
	if err := DB.AutoMigrate(&models.ConnectorInfo{}); err != nil {
		return fmt.Errorf("failed to migrate ConnectorInfo to the db: %w", err)
	}
	if err = DB.AutoMigrate(&models.Operation{}); err != nil {
		return fmt.Errorf("failed to migrate Operation to the db: %w", err)
	}
	if err = DB.AutoMigrate(&models.ConnectorRegistration{}); err != nil {
		return fmt.Errorf("failed to migrate ConnectorRegistration to the db: %w", err)
	}

	return nil
}

// CreateConnector inserts a new ConnectorInfo record into the database.
func CreateConnector(connector *models.ConnectorInfo) error {
	if err := DB.Create(connector).Error; err != nil {
		return fmt.Errorf("failed to create connector record: %w", err)
	}
	log.Printf("Created connector with ID: %s\n", connector.ID)
	return nil
}

// CreateOperation inserts a new Operation record into the database.
func CreateOperation(operation *models.Operation) error {
	if err := DB.Create(operation).Error; err != nil {
		return fmt.Errorf("failed to create operation record: %w", err)
	}
	log.Printf("Created operation with ID: %s\n", operation.ID)
	return nil
}

// CreateConnectorRegistration inserts a new ConnectorRegistration record into the database.
func CreateConnectorRegistration(registration *models.ConnectorRegistration) error {
	if err := DB.Create(registration).Error; err != nil {
		return fmt.Errorf("failed to create connector registration record: %w", err)
	}
	log.Printf("Created connector registration with ID: %s\n", registration.ID)
	return nil
}

// GetAllConnectors retrieves all ConnectorInfo records from the database.
func GetAllConnectors() ([]models.ConnectorInfo, error) {
	var connectors []models.ConnectorInfo
	if err := DB.Find(&connectors).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch connectors: %w", err)
	}
	return connectors, nil
}

// GetAllOperations retrieves all Operation records from the database.
func GetAllOperations() ([]models.Operation, error) {
	var operations []models.Operation
	if err := DB.Find(&operations).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch operations: %w", err)
	}
	return operations, nil
}

// GetAllConnectorRegistrations retrieves all ConnectorRegistration records from the database.
func GetAllConnectorRegistrations() ([]models.ConnectorRegistration, error) {
	var registrations []models.ConnectorRegistration
	if err := DB.Find(&registrations).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch connector registrations: %w", err)
	}
	return registrations, nil
}

// DeleteConnector removes the record with the specified ID from the database.
func DeleteConnector(id string) error {
	if err := DB.Delete(&models.ConnectorInfo{}, id).Error; err != nil {
		return fmt.Errorf("failed to delete connector: %w", err)
	}
	return nil
}

// DeleteOperation removes the record with the specified ID from the database.
func DeleteOperation(id string) error {
	if err := DB.Delete(&models.Operation{}, id).Error; err != nil {
		return fmt.Errorf("failed to delete operation: %w", err)
	}
	return nil
}

// DeleteConnectorRegistration removes the record with the specified ID from the database.
func DeleteConnectorRegistration(id string) error {
	if err := DB.Delete(&models.ConnectorRegistration{}, id).Error; err != nil {
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
