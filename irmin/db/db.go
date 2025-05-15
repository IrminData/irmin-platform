package db

import (
	"context"
	"fmt"
	"irmin-api/utils"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// RunStatusNotificationPayload represents the structure of a notification from PostgreSQL.
type RunStatusNotificationPayload struct {
	ID        uint   `json:"id"`
	Status    string `json:"status"`
	Operation string `json:"operation"`
}

// Database represents a database connection and its operations.
type Database struct {
	*gorm.DB
	pool *pgxpool.Pool
}

// NewDatabase creates a new database instance.
func NewDatabase(db *gorm.DB, connectionString string) (*Database, error) {
	// Create a pgx connection pool
	poolConfig, err := pgxpool.ParseConfig(connectionString)
	if err != nil {
		return nil, fmt.Errorf("failed to parse pgx connection string: %w", err)
	}

	pool, err := pgxpool.NewWithConfig(context.Background(), poolConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create pgx connection pool: %w", err)
	}

	// Test the connection
	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return &Database{
		DB:   db,
		pool: pool,
	}, nil
}

// Close closes all database connections.
func (d *Database) Close() {
	if d.pool != nil {
		d.pool.Close()
	}
}

// GetPgxConn returns a pgx connection from the pool.
// The connection should be returned to the pool using conn.Release() when done.
func (d *Database) GetPgxConn(ctx context.Context) (*pgxpool.Conn, error) {
	return d.pool.Acquire(ctx)
}

// ListenForNotifications starts listening for notifications on a specific channel.
// It returns a function that can be called to stop listening.
func (d *Database) ListenForNotifications(ctx context.Context, channel string) (func() error, error) {
	conn, err := d.GetPgxConn(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get connection for notifications: %w", err)
	}

	// Start listening
	if _, err := conn.Exec(ctx, fmt.Sprintf("LISTEN %s", channel)); err != nil {
		conn.Release()
		return nil, fmt.Errorf("failed to start listening on channel %s: %w", channel, err)
	}

	// Return a cleanup function
	return func() error {
		conn.Release()
		return nil
	}, nil
}

// WaitForNotification waits for a notification on the given channel.
// It uses the connection pool to get a connection and waits for notifications.
func (d *Database) WaitForNotification(ctx context.Context, channel string) (*pgconn.Notification, error) {
	conn, err := d.GetPgxConn(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get connection for notification: %w", err)
	}
	defer conn.Release()

	// Wait for notification
	notification, err := conn.Conn().WaitForNotification(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to wait for notification on channel %s: %w", channel, err)
	}

	return notification, nil
}

// InitialiseDB establishes a Postgres database connection, performs any necessary migrations,
// and returns an error if something goes wrong.
func InitialiseDB() (*Database, error) {
	// Load environment variables.
	env, err := utils.LoadEnv()
	if err != nil {
		return nil, fmt.Errorf("failed to load environment variables: %w", err)
	}

	db, err := gorm.Open(postgres.Open(env.DatabaseConnectionString), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	database, err := NewDatabase(db, env.DatabaseConnectionString)
	if err != nil {
		return nil, err
	}

	// Ensure notification trigger exists
	if err := database.EnsureNotificationTrigger(context.Background()); err != nil {
		database.Close()
		return nil, fmt.Errorf("failed to ensure notification trigger: %w", err)
	}

	return database, nil
}

// Migrate runs the auto migration calls in the correct order.
// It separates the migrations into groups based on model dependencies.
func (d *Database) Migrate() error {
	if err := d.AutoMigrate(&Workspace{}); err != nil {
		return fmt.Errorf("failed to migrate Workspace: %w", err)
	}
	if err := d.AutoMigrate(&User{}); err != nil {
		return fmt.Errorf("failed to migrate User: %w", err)
	}
	if err := d.AutoMigrate(&Connector{}); err != nil {
		return fmt.Errorf("failed to migrate Connector: %w", err)
	}
	if err := d.AutoMigrate(&WorkspaceUser{}); err != nil {
		return fmt.Errorf("failed to migrate WorkspaceUser: %w", err)
	}
	if err := d.AutoMigrate(&APIToken{}); err != nil {
		return fmt.Errorf("failed to migrate APIToken: %w", err)
	}
	if err := d.AutoMigrate(&Connection{}); err != nil {
		return fmt.Errorf("failed to migrate Connection: %w", err)
	}
	if err := d.AutoMigrate(&ConnectionSchemaCache{}); err != nil {
		return fmt.Errorf("failed to migrate ConnectionSchemaCache: %w", err)
	}
	if err := d.AutoMigrate(&Invite{}); err != nil {
		return fmt.Errorf("failed to migrate Invite: %w", err)
	}
	if err := d.AutoMigrate(&Repository{}); err != nil {
		return fmt.Errorf("failed to migrate Repository: %w", err)
	}
	if err := d.AutoMigrate(&RepositorySchemaCache{}); err != nil {
		return fmt.Errorf("failed to migrate RepositorySchemaCache: %w", err)
	}
	if err := d.AutoMigrate(&ImportWorkflowable{}); err != nil {
		return fmt.Errorf("failed to migrate ImportWorkflowable: %w", err)
	}
	if err := d.AutoMigrate(&ExportWorkflowable{}); err != nil {
		return fmt.Errorf("failed to migrate ExportWorkflowable: %w", err)
	}
	if err := d.AutoMigrate(&ActionWorkflowableInput{}); err != nil {
		return fmt.Errorf("failed to migrate ActionWorkflowableInput: %w", err)
	}
	if err := d.AutoMigrate(&ActionWorkflowable{}); err != nil {
		return fmt.Errorf("failed to migrate ActionWorkflowable: %w", err)
	}
	if err := d.AutoMigrate(&PipelineStage{}); err != nil {
		return fmt.Errorf("failed to migrate PipelineStage: %w", err)
	}
	if err := d.AutoMigrate(&PipelineWorkflowable{}); err != nil {
		return fmt.Errorf("failed to migrate PipelineWorkflowable: %w", err)
	}
	if err := d.AutoMigrate(&Workflow{}); err != nil {
		return fmt.Errorf("failed to migrate Workflow: %w", err)
	}
	if err := d.AutoMigrate(&Schedule{}); err != nil {
		return fmt.Errorf("failed to migrate Schedule: %w", err)
	}
	if err := d.AutoMigrate(&WorkflowTrigger{}); err != nil {
		return fmt.Errorf("failed to migrate WorkflowTrigger: %w", err)
	}
	if err := d.AutoMigrate(&WorkflowRun{}); err != nil {
		return fmt.Errorf("failed to migrate WorkflowRun: %w", err)
	}
	if err := d.AutoMigrate(&StoredQuery{}); err != nil {
		return fmt.Errorf("failed to migrate StoredQuery: %w", err)
	}
	if err := d.AutoMigrate(&LogEvent{}); err != nil {
		return fmt.Errorf("failed to migrate LogEvent: %w", err)
	}

	return nil
}

// Reset drops all tables to start fresh.
func (d *Database) Reset() error {
	// Drop tables in an order that avoids foreign key conflicts.
	if err := d.Migrator().DropTable(
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
func (d *Database) RunRawQuery(sqlQuery string, args ...any) error {
	if err := d.Exec(sqlQuery, args...).Error; err != nil {
		return fmt.Errorf("failed to execute raw query: %w", err)
	}
	return nil
}

// EnsureNotificationTrigger ensures that the workflow run notification trigger exists in the database.
func (d *Database) EnsureNotificationTrigger(ctx context.Context) error {
	// Check if the trigger already exists
	var exists bool
	err := d.WithContext(ctx).Raw(`
		SELECT EXISTS (
			SELECT 1 FROM pg_trigger 
			WHERE tgname = 'workflow_run_notify'
		)
	`).Scan(&exists).Error
	if err != nil {
		return err
	}

	if exists {
		return nil
	}

	// Apply the trigger if it doesn't exist
	return d.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Create the notification function
		if err := tx.Exec(`
			CREATE OR REPLACE FUNCTION notify_workflow_run_status()
			RETURNS trigger AS $$
			BEGIN
				-- Notify on any status change using native pg_notify
				PERFORM pg_notify(
					'workflow_run_status',
					json_build_object(
						'id', NEW.id,
						'status', NEW.status,
						'operation', TG_OP
					)::text
				);
				RETURN NEW;
			END;
			$$ LANGUAGE plpgsql;
		`).Error; err != nil {
			return err
		}

		// Create the trigger
		if err := tx.Exec(`
			CREATE TRIGGER workflow_run_notify
				AFTER INSERT OR UPDATE OF status ON workflow_runs
				FOR EACH ROW
				EXECUTE FUNCTION notify_workflow_run_status();
		`).Error; err != nil {
			return err
		}

		return nil
	})
}
