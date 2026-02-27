package db

import (
	"context"
	"fmt"
	"irmin-api/utils"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// RunStatusNotificationPayload represents the structure of a notification from PostgreSQL.
type RunStatusNotificationPayload struct {
	ID        uint   `json:"id"`
	Status    string `json:"status"`
	Operation string `json:"operation"`
}

// Database represents a database connection and its operations.
// It now shares a single underlying pgxpool for both GORM and direct pgx access.
type Database struct {
	*gorm.DB
	pool *pgxpool.Pool
}

// Connection pool settings, tuned for running with PgBouncer and Fiber's prefork.
// With N preforked processes, the total client connections to PgBouncer will be N * appMaxConnsPerProcess.
const (
	// The number of connections each application process can open.
	// This should be a low number to avoid exhausting PgBouncer's max_client_conn.
	// Note: The orchestrator's dispatcher permanently holds 2 connections for LISTEN/NOTIFY,
	// so we need at least 10-15 connections for API requests and workflow execution.
	appMaxConnsPerProcess = 15
	appMinConnsPerProcess = 3

	// How long a connection can be in use before it's recycled.
	appConnMaxLifetime = time.Hour
	// How long a connection can be idle in the pool before it's closed.
	appConnMaxIdleTime = 30 * time.Minute
	// How long to wait for a new connection to be established with the database.
	appConnectTimeout = 10 * time.Second
)

// InitialiseDB establishes a Postgres database connection, performs any necessary migrations,
// and returns an error if something goes wrong.
func InitialiseDB(env *utils.CoreAPIEnv) (*Database, error) {
	// 1. Create a single, shared pool configuration
	poolConfig, err := pgxpool.ParseConfig(env.DatabaseConnectionString)
	if err != nil {
		return nil, fmt.Errorf("failed to parse pgx connection string: %w", err)
	}

	// --- Apply our tuned, constant-driven configuration ---
	poolConfig.MaxConns = appMaxConnsPerProcess
	poolConfig.MinConns = appMinConnsPerProcess
	poolConfig.MaxConnLifetime = appConnMaxLifetime
	poolConfig.MaxConnIdleTime = appConnMaxIdleTime
	poolConfig.ConnConfig.ConnectTimeout = appConnectTimeout

	// 2. Create the single pgxpool
	pool, err := pgxpool.NewWithConfig(context.Background(), poolConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create shared pgx connection pool: %w", err)
	}

	// Ping to verify connection before proceeding
	if pingErr := pool.Ping(context.Background()); pingErr != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to ping database via pgxpool: %w", pingErr)
	}

	// 3. Create a standard library *sql.DB that uses our pgxpool
	// This is the magic that allows GORM to use our shared pool.
	sqlDB := stdlib.OpenDBFromPool(pool)

	// 4. Initialise GORM with the existing, shared database connection
	// We pass postgres.Config{ Conn: sqlDB } to tell GORM not to create a new pool.
	db, err := gorm.Open(postgres.New(postgres.Config{
		Conn: sqlDB,
	}), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		closeErr := sqlDB.Close()
		if closeErr != nil {
			return nil, fmt.Errorf(
				"failed to open gorm with existing connection: %w, failed to close connection: %w",
				err,
				closeErr,
			)
		}
		return nil, fmt.Errorf("failed to open gorm with existing connection: %w", err)
	}

	database := &Database{
		DB:   db,
		pool: pool,
	}

	return database, nil
}

// Close closes the shared database connection pool.
func (d *Database) Close() {
	if d.pool != nil {
		d.pool.Close()
	}
}

// GetPgxConn returns a pgx connection from the shared pool.
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

	// Use sync.Once to ensure cleanup happens exactly once
	var once sync.Once
	// Use a channel to signal when cleanup has been performed, allowing the goroutine to exit
	done := make(chan struct{})

	cleanup := func() {
		conn.Release()
		// Signal that cleanup is done (safe to call multiple times due to sync.Once)
		select {
		case <-done:
			// Channel already closed
		default:
			close(done)
		}
	}

	// Monitor context cancellation to ensure connection is released
	go func() {
		select {
		case <-ctx.Done():
			once.Do(cleanup)
		case <-done:
			// Cleanup was called manually, exit goroutine
		}
	}()

	// Return a cleanup function
	return func() error {
		once.Do(cleanup)
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
		&Role{},
		&Connector{},
		&Workspace{},
		&WorkspaceUser{},
		&WorkspaceUserRole{},
		&User{},
		&APIToken{},
		&Connection{},
		&Invite{},
		&Repository{},
		&ImportWorkflowable{},
		&ExportWorkflowable{},
		&ActionWorkflowableInput{},
		&ActionWorkflowable{},
		&PipelineStage{},
		&PipelineWorkflowable{},
		&Workflow{},
		&Schedule{},
		&WorkflowTrigger{},
		&WorkflowRun{},
		&StoredQuery{},
		&StoredScript{},
		&LogEvent{},
		&ConnectionSchemaCache{},
		&ConnectionSubscription{},
		&RepositorySchemaCache{},
		&RepositoryObject{},
		&Policy{},
		&Tag{},
		&QueryTag{},
		&ScriptTag{},
		&RepositoryTag{},
		&WorkflowTag{},
		&ConnectionTag{},
		&RepositoryObjectTag{},
		&AIApplication{},
		&AIApplicationDataSource{},
		&AIApplicationTag{},
		&AIApplicationCustomTool{},
		&AIApplicationToolLog{},
		&AIApplicationPendingWrite{},
		&Template{},
		&AsyncJob{},
	}
	if err := d.migrateModels(models...); err != nil {
		return err
	}

	// Create search indexes for better performance
	if err := d.CreateSearchIndexes(); err != nil {
		return fmt.Errorf("failed to create search indexes: %w", err)
	}

	// Ensure notification trigger exists after all tables are created
	if err := d.EnsureNotificationTrigger(context.Background()); err != nil {
		return fmt.Errorf("failed to ensure notification trigger: %w", err)
	}

	return nil
}

// Reset drops all tables to start fresh.
func (d *Database) Reset() error {
	// Drop tables in an order that avoids foreign key conflicts.
	if err := d.Migrator().DropTable(
		&AIApplicationTag{},
		&AIApplicationDataSource{},
		&AIApplicationCustomTool{},
		&AIApplicationPendingWrite{}, // Must be before ToolLog due to foreign key
		&AIApplicationToolLog{},
		&AIApplication{},
		&Role{},
		&Connector{},
		&Workspace{},
		&WorkspaceUserRole{},
		&WorkspaceUser{},
		&User{},
		&APIToken{},
		&Connection{},
		&Invite{},
		&Repository{},
		&ImportWorkflowable{},
		&ExportWorkflowable{},
		&ActionWorkflowableInput{},
		&ActionWorkflowable{},
		&PipelineStage{},
		&PipelineWorkflowable{},
		&Workflow{},
		&Schedule{},
		&WorkflowTrigger{},
		&WorkflowRun{},
		&StoredQuery{},
		&StoredScript{},
		&LogEvent{},
		&ConnectionSchemaCache{},
		&ConnectionSubscription{},
		&RepositorySchemaCache{},
		&RepositoryObject{},
		&Policy{},
		&QueryTag{},
		&ScriptTag{},
		&RepositoryTag{},
		&WorkflowTag{},
		&ConnectionTag{},
		&RepositoryObjectTag{},
		&Tag{},
		&Template{},
		&AsyncJob{},
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
