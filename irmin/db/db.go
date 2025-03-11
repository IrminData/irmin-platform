package db

import (
	"fmt"
	"irmin-api/utils"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// DB is a global handle to the database connection.
var DB *gorm.DB

// InitialiseDB establishes a Postgres database connection, performs any necessary migrations,
// and returns an error if something goes wrong.
func InitialiseDB() error {
	// Load environment variables
	env, err := utils.LoadEnv()
	if err != nil {
		return fmt.Errorf("failed to load environment variables: %w", err)
	}

	db, err := gorm.Open(postgres.Open(env.DatabaseConnectionString), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	// Store the connection globally, or handle as you see fit.
	DB = db

	// Auto-migrate models (which include GORM annotations).
	if err = DB.AutoMigrate(&Connector{}); err != nil {
		return fmt.Errorf("failed to migrate Connector to the db: %w", err)
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
