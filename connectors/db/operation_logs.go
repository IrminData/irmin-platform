package db

import (
	"fmt"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type LogEventType string

const (
	LogEventTypeError   LogEventType = "ERROR"
	LogEventTypeInfo    LogEventType = "INFO"
	LogEventTypeWarning LogEventType = "WARNING"
)

// OperationLog represents a record of a log tied to an operation.
type OperationLog struct {
	gorm.Model

	Type LogEventType `json:"type"`

	Message  string         `json:"message"  gorm:"type:text"`
	Metadata datatypes.JSON `json:"metadata" gorm:"type:json"` // Arbitrary structured data that stores information about the log - e.g., userId: 100.

	OperationID uint       `json:"operation_id"        gorm:"index"`
	Operation   *Operation `json:"operation,omitempty" gorm:"foreignKey:OperationID"`
}

// CreateOperationLog inserts a new OperationLog record into the database.
func (d *Database) CreateOperationLog(operationLog *OperationLog) (*OperationLog, error) {
	if err := d.Create(operationLog).Error; err != nil {
		return nil, fmt.Errorf("failed to create operation log record: %w", err)
	}
	return operationLog, nil
}
