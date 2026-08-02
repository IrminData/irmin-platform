package db

import (
	"errors"

	"gorm.io/gorm"
)

// ErrLockNotHeld is returned when attempting to unlock an advisory lock
// that is not held by the current session.
var ErrLockNotHeld = errors.New("advisory lock not held by current session")

// LockKeyTx takes a namespaced key and grabs a 64-bit transactional advisory lock.
func LockKeyTx(tx *gorm.DB, key string) error {
	return tx.Exec(
		"SELECT pg_advisory_xact_lock(hashtextextended(?, 0))",
		key,
	).Error
}

// TryLockKey attempts to acquire a session-scoped advisory lock without blocking.
// Returns true if the lock was acquired, false if it's already held by another session.
// The lock must be explicitly released with UnlockKey.
func TryLockKey(db *gorm.DB, key string) (bool, error) {
	var locked bool
	err := db.Raw(
		"SELECT pg_try_advisory_lock(hashtextextended(?, 0))",
		key,
	).Scan(&locked).Error
	if err != nil {
		return false, err
	}
	return locked, nil
}

// UnlockKey releases a session-scoped advisory lock.
// Returns ErrLockNotHeld if the lock was not held by the current session.
func UnlockKey(db *gorm.DB, key string) error {
	var unlocked bool
	err := db.Raw(
		"SELECT pg_advisory_unlock(hashtextextended(?, 0))",
		key,
	).Scan(&unlocked).Error
	if err != nil {
		return err
	}
	if !unlocked {
		// Lock was not held by this session
		return ErrLockNotHeld
	}
	return nil
}

// WithSessionLock pins a database connection, acquires a session-scoped advisory lock,
// runs the provided function, then releases the lock — all on the same session.
// Returns (true, err) if the lock was acquired and fn was executed.
// Returns (false, nil) if the lock is already held by another session.
func WithSessionLock(db *gorm.DB, key string, fn func(conn *gorm.DB) error) (bool, error) {
	var acquired bool
	err := db.Connection(func(conn *gorm.DB) error {
		// Try to acquire lock on this pinned connection
		if lockErr := conn.Raw(
			"SELECT pg_try_advisory_lock(hashtextextended(?, 0))", key,
		).Scan(&acquired).Error; lockErr != nil {
			return lockErr
		}
		if !acquired {
			return nil
		}

		// Ensure unlock runs on the same pinned connection
		defer func() {
			var unlocked bool
			_ = conn.Raw(
				"SELECT pg_advisory_unlock(hashtextextended(?, 0))", key,
			).Scan(&unlocked).Error
		}()

		return fn(conn)
	})
	return acquired, err
}
