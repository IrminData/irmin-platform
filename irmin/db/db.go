package db

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/utils"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
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
type Database struct {
	*gorm.DB
	pool *pgxpool.Pool
}

// Connection pool settings.
const (
	maxIdleConns    = 10
	maxOpenConns    = 50
	connMaxLifetime = time.Hour

	// Connection pool validation constants.
	minPoolSize        = 1
	maxPoolSize        = 100
	minConnTimeout     = 1 * time.Second
	maxConnTimeout     = 30 * time.Second
	minConnMaxLifetime = 1 * time.Minute
	maxConnMaxLifetime = 24 * time.Hour
	minConnMaxIdleTime = 1 * time.Minute
	maxConnMaxIdleTime = 8 * time.Hour

	// Default connection pool settings.
	defaultMaxConns        = 10
	defaultMinConnsDivisor = 5
	defaultConnectTimeout  = 10 * time.Second
)

// validatePoolConfig validates the connection pool configuration parameters.
func validatePoolConfig(config *pgxpool.Config) error {
	if config == nil {
		return errors.New("pool configuration cannot be nil")
	}

	// Validate connection string
	if config.ConnConfig.Host == "" {
		return errors.New("database host cannot be empty")
	}

	if config.ConnConfig.Database == "" {
		return errors.New("database name cannot be empty")
	}

	if config.ConnConfig.User == "" {
		return errors.New("database user cannot be empty")
	}

	// Validate pool size limits
	if config.MinConns < minPoolSize {
		return fmt.Errorf("minimum connections (%d) must be at least %d", config.MinConns, minPoolSize)
	}

	if config.MaxConns > maxPoolSize {
		return fmt.Errorf("maximum connections (%d) cannot exceed %d", config.MaxConns, maxPoolSize)
	}

	if config.MinConns > config.MaxConns {
		return fmt.Errorf(
			"minimum connections (%d) cannot be greater than maximum connections (%d)",
			config.MinConns,
			config.MaxConns,
		)
	}

	// Validate timeout settings
	if config.ConnConfig.ConnectTimeout < minConnTimeout {
		return fmt.Errorf(
			"connection timeout (%v) must be at least %v",
			config.ConnConfig.ConnectTimeout,
			minConnTimeout,
		)
	}

	if config.ConnConfig.ConnectTimeout > maxConnTimeout {
		return fmt.Errorf("connection timeout (%v) cannot exceed %v", config.ConnConfig.ConnectTimeout, maxConnTimeout)
	}

	// Validate connection lifecycle settings
	if config.MaxConnLifetime < 0 {
		return fmt.Errorf("connection max lifetime (%v) cannot be negative", config.MaxConnLifetime)
	}

	if config.MaxConnLifetime > 0 && config.MaxConnLifetime < minConnMaxLifetime {
		return fmt.Errorf(
			"connection max lifetime (%v) must be at least %v",
			config.MaxConnLifetime,
			minConnMaxLifetime,
		)
	}

	if config.MaxConnLifetime > maxConnMaxLifetime {
		return fmt.Errorf("connection max lifetime (%v) cannot exceed %v", config.MaxConnLifetime, maxConnMaxLifetime)
	}

	if config.MaxConnIdleTime < 0 {
		return fmt.Errorf("connection max idle time (%v) cannot be negative", config.MaxConnIdleTime)
	}

	if config.MaxConnIdleTime > 0 && config.MaxConnIdleTime < minConnMaxIdleTime {
		return fmt.Errorf(
			"connection max idle time (%v) must be at least %v",
			config.MaxConnIdleTime,
			minConnMaxIdleTime,
		)
	}

	if config.MaxConnIdleTime > maxConnMaxIdleTime {
		return fmt.Errorf("connection max idle time (%v) cannot exceed %v", config.MaxConnIdleTime, maxConnMaxIdleTime)
	}

	return nil
}

// NewDatabase creates a new database instance.
func NewDatabase(db *gorm.DB, connectionString string) (*Database, error) {
	// Create a pgx connection pool
	poolConfig, parseConfigErr := pgxpool.ParseConfig(connectionString)
	if parseConfigErr != nil {
		return nil, fmt.Errorf("failed to parse pgx connection string: %w", parseConfigErr)
	}

	// Apply sensible defaults only when values are not explicitly set
	// Note: pgxpool.ParseConfig may already set some defaults

	// Handle connection pool size defaults consistently
	if poolConfig.MaxConns == 0 {
		poolConfig.MaxConns = defaultMaxConns
	}
	if poolConfig.MinConns == 0 {
		// Set MinConns to a reasonable fraction of MaxConns, but at least 1
		poolConfig.MinConns = max(1, poolConfig.MaxConns/defaultMinConnsDivisor)
	}

	// Ensure MinConns doesn't exceed MaxConns after defaults are applied
	if poolConfig.MinConns > poolConfig.MaxConns {
		poolConfig.MinConns = poolConfig.MaxConns
	}

	// Set connection timeout default if not configured
	if poolConfig.ConnConfig.ConnectTimeout == 0 {
		poolConfig.ConnConfig.ConnectTimeout = defaultConnectTimeout
	}

	// Note: MaxConnLifetime and MaxConnIdleTime are left as 0 by default
	// In pgxpool, 0 means "no limit" which is often the desired behavior
	// Users can explicitly set these values in their connection string if needed

	// Validate pool configuration before creating the pool
	if validationErr := validatePoolConfig(poolConfig); validationErr != nil {
		return nil, fmt.Errorf("invalid pool configuration: %w", validationErr)
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

// InitialiseDB establishes a Postgres database connection, performs any necessary migrations,
// and returns an error if something goes wrong.
func InitialiseDB(env *utils.CoreAPIEnv) (*Database, error) {
	db, openErr := gorm.Open(postgres.Open(env.DatabaseConnectionString), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if openErr != nil {
		return nil, fmt.Errorf("failed to open database: %w", openErr)
	}

	// Set up connection pool
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql db: %w", err)
	}
	sqlDB.SetMaxIdleConns(maxIdleConns)
	sqlDB.SetMaxOpenConns(maxOpenConns)
	sqlDB.SetConnMaxLifetime(connMaxLifetime)

	database, newDatabaseErr := NewDatabase(db, env.DatabaseConnectionString)
	if newDatabaseErr != nil {
		return nil, newDatabaseErr
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
		&LogEvent{},
		&ConnectionSchemaCache{},
		&RepositorySchemaCache{},
		&RepositoryObject{},
		&Policy{},
		&Tag{},
		&QueryTag{},
		&RepositoryTag{},
		&WorkflowTag{},
		&ConnectionTag{},
		&RepositoryObjectTag{},
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
		&LogEvent{},
		&ConnectionSchemaCache{},
		&RepositorySchemaCache{},
		&RepositoryObject{},
		&Policy{},
		&QueryTag{},
		&RepositoryTag{},
		&WorkflowTag{},
		&ConnectionTag{},
		&RepositoryObjectTag{},
		&Tag{},
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
