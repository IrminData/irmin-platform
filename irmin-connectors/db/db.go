package db

import (
	"fmt"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
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
	if err = DB.AutoMigrate(&Operation{}); err != nil {
		return fmt.Errorf("failed to migrate Operation to the db: %w", err)
	}
	if err = DB.AutoMigrate(&ConnectorRegistration{}); err != nil {
		return fmt.Errorf("failed to migrate ConnectorRegistration to the db: %w", err)
	}
	if err = DB.AutoMigrate(&Subscription{}); err != nil {
		return fmt.Errorf("failed to migrate Subscription to the db: %w", err)
	}

	return nil
}

// RunRawQuery can be used to execute a raw SQL query against the database.
func RunRawQuery(sqlQuery string, args ...any) error {
	if err := DB.Exec(sqlQuery, args...).Error; err != nil {
		return fmt.Errorf("failed to execute raw query: %w", err)
	}
	return nil
}
