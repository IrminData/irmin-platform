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
	// Load environment variables.
	env, err := utils.LoadEnv()
	if err != nil {
		return fmt.Errorf("failed to load environment variables: %w", err)
	}

	db, err := gorm.Open(postgres.Open(env.DatabaseConnectionString), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	// Store the connection globally.
	DB = db

	return nil
}

// Migrate runs the auto migration calls in the correct order.
// It separates the migrations into groups based on model dependencies.
func Migrate() error {
	if err := DB.AutoMigrate(&Workspace{}); err != nil {
		return fmt.Errorf("failed to migrate Workspace: %w", err)
	}
	if err := DB.AutoMigrate(&User{}); err != nil {
		return fmt.Errorf("failed to migrate User: %w", err)
	}
	if err := DB.AutoMigrate(&Connector{}); err != nil {
		return fmt.Errorf("failed to migrate Connector: %w", err)
	}
	if err := DB.AutoMigrate(&WorkspaceUser{}); err != nil {
		return fmt.Errorf("failed to migrate WorkspaceUser: %w", err)
	}
	if err := DB.AutoMigrate(&APIToken{}); err != nil {
		return fmt.Errorf("failed to migrate APIToken: %w", err)
	}
	if err := DB.AutoMigrate(&Connection{}); err != nil {
		return fmt.Errorf("failed to migrate Connection: %w", err)
	}
	if err := DB.AutoMigrate(&Invite{}); err != nil {
		return fmt.Errorf("failed to migrate Invite: %w", err)
	}
	if err := DB.AutoMigrate(&Repository{}); err != nil {
		return fmt.Errorf("failed to migrate Repository: %w", err)
	}
	if err := DB.AutoMigrate(&ImportWorkflowable{}); err != nil {
		return fmt.Errorf("failed to migrate ImportWorkflowable: %w", err)
	}
	if err := DB.AutoMigrate(&ExportWorkflowable{}); err != nil {
		return fmt.Errorf("failed to migrate ExportWorkflowable: %w", err)
	}
	if err := DB.AutoMigrate(&ActionWorkflowable{}); err != nil {
		return fmt.Errorf("failed to migrate ActionWorkflowable: %w", err)
	}
	if err := DB.AutoMigrate(&PipelineStage{}); err != nil {
		return fmt.Errorf("failed to migrate PipelineStage: %w", err)
	}
	if err := DB.AutoMigrate(&PipelineWorkflowable{}); err != nil {
		return fmt.Errorf("failed to migrate PipelineWorkflowable: %w", err)
	}
	if err := DB.AutoMigrate(&Workflow{}); err != nil {
		return fmt.Errorf("failed to migrate Workflow: %w", err)
	}
	if err := DB.AutoMigrate(&Schedule{}); err != nil {
		return fmt.Errorf("failed to migrate Schedule: %w", err)
	}
	if err := DB.AutoMigrate(&WorkflowTrigger{}); err != nil {
		return fmt.Errorf("failed to migrate WorkflowTrigger: %w", err)
	}
	if err := DB.AutoMigrate(&WorkflowRun{}); err != nil {
		return fmt.Errorf("failed to migrate WorkflowRun: %w", err)
	}
	if err := DB.AutoMigrate(&StoredQuery{}); err != nil {
		return fmt.Errorf("failed to migrate StoredQuery: %w", err)
	}
	if err := DB.AutoMigrate(&LogEvent{}); err != nil {
		return fmt.Errorf("failed to migrate LogEvent: %w", err)
	}

	return nil
}

// Reset drops all tables to start fresh.
func Reset() error {
	// Drop tables in an order that avoids foreign key conflicts.
	if err := DB.Migrator().DropTable(
		&Connector{},
		&Workspace{},
		&WorkspaceUser{},
		&User{},
		&APIToken{},
		&Connection{},
		&Invite{},
		&Repository{},
		&ImportWorkflowable{},
		&ExportWorkflowable{},
		&ActionWorkflowable{},
		&PipelineStage{},
		&PipelineWorkflowable{},
		&Workflow{},
		&Schedule{},
		&WorkflowTrigger{},
		&WorkflowRun{},
		&StoredQuery{},
		&LogEvent{},
	); err != nil {
		return fmt.Errorf("failed to drop tables: %w", err)
	}
	return nil
}

// RunRawQuery executes a raw SQL query against the database.
func RunRawQuery(sqlQuery string, args ...any) error {
	if err := DB.Exec(sqlQuery, args...).Error; err != nil {
		return fmt.Errorf("failed to execute raw query: %w", err)
	}
	return nil
}
