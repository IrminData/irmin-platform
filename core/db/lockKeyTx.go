package db

import "gorm.io/gorm"

// LockKeyTx takes a namespaced key and grabs a 64-bit transactional advisory lock.
// This is a blocking lock that will wait until the lock is available.
func LockKeyTx(tx *gorm.DB, key string) error {
	return tx.Exec(
		"SELECT pg_advisory_xact_lock(hashtextextended(?, 0))",
		key,
	).Error
}

// TryLockKeyTx attempts to acquire a 64-bit transactional advisory lock without blocking.
// Returns true if the lock was acquired, false if it's already held by another transaction.
func TryLockKeyTx(tx *gorm.DB, key string) (bool, error) {
	var locked bool
	err := tx.Raw(
		"SELECT pg_try_advisory_xact_lock(hashtextextended(?, 0))",
		key,
	).Scan(&locked).Error
	if err != nil {
		return false, err
	}
	return locked, nil
}
