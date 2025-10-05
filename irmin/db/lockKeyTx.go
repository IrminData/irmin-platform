package db

import "gorm.io/gorm"

// LockKeyTx takes a namespaced key and grabs a 64-bit transactional advisory lock.
func LockKeyTx(tx *gorm.DB, key string) error {
	return tx.Exec(
		"SELECT pg_advisory_xact_lock(hashtextextended(?, 0))",
		key,
	).Error
}
