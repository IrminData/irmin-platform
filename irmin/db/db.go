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
	poolConfig, parseConfigErr := pgxpool.ParseConfig(connectionString)
	if parseConfigErr != nil {
		return nil, fmt.Errorf("failed to parse pgx connection string: %w", parseConfigErr)
	}

	pool, newPoolErr := pgxpool.NewWithConfig(context.Background(), poolConfig)
	if newPoolErr != nil {
		return nil, fmt.Errorf("failed to create pgx connection pool: %w", newPoolErr)
	}

	// Test the connection
	if pingErr := pool.Ping(context.Background()); pingErr != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to ping database: %w", pingErr)
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
	conn, getConnErr := d.GetPgxConn(ctx)
	if getConnErr != nil {
		return nil, fmt.Errorf("failed to get connection for notifications: %w", getConnErr)
	}

	// Start listening
	if _, execErr := conn.Exec(ctx, fmt.Sprintf("LISTEN %s", channel)); execErr != nil {
		conn.Release()
		return nil, fmt.Errorf("failed to start listening on channel %s: %w", channel, execErr)
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
	conn, getConnErr := d.GetPgxConn(ctx)
	if getConnErr != nil {
		return nil, fmt.Errorf("failed to get connection for notification: %w", getConnErr)
	}
	defer conn.Release()

	// Wait for notification
	notification, waitForNotificationErr := conn.Conn().WaitForNotification(ctx)
	if waitForNotificationErr != nil {
		return nil, fmt.Errorf("failed to wait for notification on channel %s: %w", channel, waitForNotificationErr)
	}

	return notification, nil
}

// InitialiseDB establishes a Postgres database connection, performs any necessary migrations,
// and returns an error if something goes wrong.
func InitialiseDB(env *utils.CoreAPIEnv) (*Database, error) {
	db, openErr := gorm.Open(postgres.Open(env.DatabaseConnectionString), &gorm.Config{})
	if openErr != nil {
		return nil, fmt.Errorf("failed to open database: %w", openErr)
	}

	database, newDatabaseErr := NewDatabase(db, env.DatabaseConnectionString)
	if newDatabaseErr != nil {
		return nil, newDatabaseErr
	}

	// Ensure notification trigger exists
	if ensureNotificationTriggerErr := database.EnsureNotificationTrigger(context.Background()); ensureNotificationTriggerErr != nil {
		database.Close()
		return nil, fmt.Errorf("failed to ensure notification trigger: %w", ensureNotificationTriggerErr)
	}

	return database, nil
}

// migrateModels performs auto-migration for a slice of models and returns the first error encountered.
func (d *Database) migrateModels(models ...any) error {
	for _, model := range models {
		if err := d.AutoMigrate(model); err != nil {
			return fmt.Errorf("failed to migrate %T: %w", model, err)
		}
	}
	return nil
}

// Migrate runs the auto migration calls in the correct order.
// It separates the migrations into groups based on model dependencies.
func (d *Database) Migrate() error {
	models := []any{
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
		&ConnectionSchemaCache{},
		&RepositorySchemaCache{},
	}
	if err := d.migrateModels(models...); err != nil {
		return err
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
		&ConnectionSchemaCache{},
		&RepositorySchemaCache{},
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
	scanErr := d.WithContext(ctx).Raw(`
			SELECT EXISTS (
			SELECT 1 FROM pg_trigger 
			WHERE tgname = 'workflow_run_notify'
		)
		`).Scan(&exists).Error
	if scanErr != nil {
		return scanErr
	}

	if exists {
		return nil
	}

	// Apply the trigger if it doesn't exist
	return d.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Create the notification function
		if createFunctionErr := tx.Exec(`
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
		`).Error; createFunctionErr != nil {
			return createFunctionErr
		}

		// Create the trigger
		if createTriggerErr := tx.Exec(`
			CREATE TRIGGER workflow_run_notify
				AFTER INSERT OR UPDATE OF status ON workflow_runs
				FOR EACH ROW
				EXECUTE FUNCTION notify_workflow_run_status();
		`).Error; createTriggerErr != nil {
			return createTriggerErr
		}

		return nil
	})
}
