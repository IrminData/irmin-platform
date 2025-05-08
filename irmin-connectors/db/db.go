package db

import (
	"fmt"
	"irmin-connectors/utils"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Database represents a database connection and its operations.
type Database struct {
	db *gorm.DB
}

// NewDatabase creates a new database instance.
func NewDatabase(db *gorm.DB) *Database {
	return &Database{db: db}
}

// InitialiseDB opens a Postgres DB connections, performs any necessary migrations,
// and returns a Database instance or an error if something goes wrong.
func InitialiseDB(runMigrations bool) (*Database, error) {
	env, err := utils.LoadEnv()
	if err != nil {
		return nil, fmt.Errorf("failed to load environment variables: %w", err)
	}

	// Open the connection to the Postgres database.
	db, err := gorm.Open(postgres.Open(env.DatabaseConnectionString), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	database := NewDatabase(db)

	// Run migrations if requested.
	if runMigrations {
		// Auto-migrate models (which include GORM annotations).
		if err = database.db.AutoMigrate(&Operation{}); err != nil {
			return nil, fmt.Errorf("failed to migrate Operation to the db: %w", err)
		}
		if err = database.db.AutoMigrate(&ConnectorRegistration{}); err != nil {
			return nil, fmt.Errorf("failed to migrate ConnectorRegistration to the db: %w", err)
		}
		if err = database.db.AutoMigrate(&Subscription{}); err != nil {
			return nil, fmt.Errorf("failed to migrate Subscription to the db: %w", err)
		}
	}

	return database, nil
}

// RunRawQuery can be used to execute a raw SQL query against the database.
func (d *Database) RunRawQuery(sqlQuery string, args ...any) error {
	if err := d.db.Exec(sqlQuery, args...).Error; err != nil {
		return fmt.Errorf("failed to execute raw query: %w", err)
	}
	return nil
}
