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
//
// Deprecated: TryLockOperationExecution + UnlockOperationExecution
// is pool-unsafe — the pool may route the unlock Raw() call to a
// different session than the one that took the lock, silently
// leaking the advisory lock until the original conn is closed. Use
// the common.JobManager.Begin / OperationGuard.Release pair
// instead, which pins a single session via WithSessionLock for the
// full operation lifetime. Kept for one release so out-of-tree
// callers have a deprecation window.
func TryLockOperationExecution(db *gorm.DB, operationID uint) (bool, error) {
	lockKey := fmt.Sprintf("operation_exec:%d", operationID)
	return TryLockKey(db, lockKey)
}

// UnlockOperationExecution releases a session-scoped advisory lock for operation execution.
//
// Deprecated: see TryLockOperationExecution for the rationale. Use
// common.JobManager.Begin / OperationGuard.Release instead.
func UnlockOperationExecution(db *gorm.DB, operationID uint) error {
	lockKey := fmt.Sprintf("operation_exec:%d", operationID)
	return UnlockKey(db, lockKey)
}

// WithOperationExecutionLock acquires a session-scoped execution lock for the operation,
// runs fn, then releases the lock — all on the same pinned database connection.
// Returns (true, err) if the lock was acquired and fn was executed.
// Returns (false, nil) if the operation is already being executed by another session.
func WithOperationExecutionLock(db *gorm.DB, operationID uint, fn func(conn *gorm.DB) error) (bool, error) {
	lockKey := fmt.Sprintf("operation_exec:%d", operationID)
	return WithSessionLock(db, lockKey, fn)
}

// WithOperationExecutionLock is the method-form wrapper around the
// package-level WithOperationExecutionLock helper. Exposed on
// *Database so the JobStore interface used by common.JobManager can
// acquire the lock without reaching through to a raw *gorm.DB —
// tests pass an in-memory fake that stubs this method while
// production keeps the pinned-connection semantics.
func (d *Database) WithOperationExecutionLock(
	operationID uint,
	fn func(conn *gorm.DB) error,
) (bool, error) {
	return WithOperationExecutionLock(d.DB, operationID, fn)
}
