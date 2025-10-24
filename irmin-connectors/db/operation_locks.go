package db

import (
	"fmt"

	"gorm.io/gorm"
)

// LockOperationCreation acquires a transaction-scoped advisory lock for operation creation.
// This lock is based on connector name and configuration hash to prevent duplicate operations
// for the same connector configuration.
//
// The lock is automatically released when the transaction commits or rolls back.
func LockOperationCreation(tx *gorm.DB, connectorName, configHash string) error {
	lockKey := fmt.Sprintf("operation_create:%s:%s", connectorName, configHash)
	return LockKeyTx(tx, lockKey)
}

// TryLockOperationExecution attempts to acquire a session-scoped advisory lock for operation execution
// without blocking. Returns true if the lock was acquired, false if already held by another session.
// This lock is based on operation ID to prevent concurrent execution of the same operation.
//
// The lock must be explicitly released with UnlockOperationExecution.
func TryLockOperationExecution(db *gorm.DB, operationID uint) (bool, error) {
	lockKey := fmt.Sprintf("operation_exec:%d", operationID)
	return TryLockKey(db, lockKey)
}

// UnlockOperationExecution releases a session-scoped advisory lock for operation execution.
func UnlockOperationExecution(db *gorm.DB, operationID uint) error {
	lockKey := fmt.Sprintf("operation_exec:%d", operationID)
	return UnlockKey(db, lockKey)
}
