package db

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgxpool"
	"gorm.io/gorm"
)

// ErrLockNotHeld is returned when attempting to unlock an advisory lock
// that is not held by the current session.
var ErrLockNotHeld = errors.New("advisory lock not held by current session")

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

// TryLockKeyConn attempts to acquire a session-scoped advisory lock using a pgx connection.
// This ensures the lock is acquired on a specific connection that must be used for unlocking.
// Returns true if the lock was acquired, false if it's already held by another session.
// The lock must be explicitly released with UnlockKeyConn using the same connection.
func TryLockKeyConn(ctx context.Context, conn *pgxpool.Conn, key string) (bool, error) {
	var locked bool
	err := conn.QueryRow(ctx, "SELECT pg_try_advisory_lock(hashtextextended($1, 0))", key).Scan(&locked)
	if err != nil {
		return false, err
	}
	return locked, nil
}

// LockKey acquires a session-scoped advisory lock, blocking until available.
// The lock must be explicitly released with UnlockKey.
func LockKey(db *gorm.DB, key string) error {
	return db.Exec(
		"SELECT pg_advisory_lock(hashtextextended(?, 0))",
		key,
	).Error
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

// UnlockKeyConn releases a session-scoped advisory lock using a pgx connection.
// This must be called with the same connection that was used to acquire the lock.
// Returns ErrLockNotHeld if the lock was not held by the current session.
func UnlockKeyConn(ctx context.Context, conn *pgxpool.Conn, key string) error {
	var unlocked bool
	err := conn.QueryRow(ctx, "SELECT pg_advisory_unlock(hashtextextended($1, 0))", key).Scan(&unlocked)
	if err != nil {
		return err
	}
	if !unlocked {
		// Lock was not held by this session
		return ErrLockNotHeld
	}
	return nil
}
