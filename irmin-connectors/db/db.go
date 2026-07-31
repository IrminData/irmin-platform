package db

import (
	"context"
	"fmt"
	"irmin-connectors/utils"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

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
	appMaxConnsPerProcess = 3
	appMinConnsPerProcess = 1

	// How long a connection can be in use before it's recycled.
	appConnMaxLifetime = time.Hour
	// How long a connection can be idle in the pool before it's closed.
	appConnMaxIdleTime = 30 * time.Minute
	// How long to wait for a new connection to be established with the database.
	appConnectTimeout = 10 * time.Second
)

// InitialiseDB establishes a Postgres database connection, performs any necessary migrations,
// and returns an error if something goes wrong.
func InitialiseDB(ctx context.Context, runMigrations bool) (*Database, error) {
	env, err := utils.LoadEnv()
	if err != nil {
		return nil, fmt.Errorf("failed to load environment variables: %w", err)
	}

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
	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create shared pgx connection pool: %w", err)
	}

	// Ping to verify connection before proceeding
	if pingErr := pool.Ping(ctx); pingErr != nil {
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

	// Run migrations if requested.
	if runMigrations {
		if migrateErr := database.Migrate(); migrateErr != nil {
			return nil, fmt.Errorf("failed to run migrations: %w", migrateErr)
		}
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
		&Operation{},
		&OperationLog{},
		&ConnectorRegistration{},
		&Subscription{},
		&OperationJob{},
	}

	if err := d.migrateModels(models...); err != nil {
		return err
	}

	if err := d.dropDeprecatedColumns(); err != nil {
		return err
	}

	return nil
}

// dropDeprecatedColumns removes columns retired by an earlier migration
// pass. AutoMigrate is additive only by design, so destructive schema
// changes have to be issued explicitly. Each step here is idempotent
// (HasColumn-then-DropColumn) so a deploy that already applied the
// drop on a previous boot is a no-op.
//
// Current entries:
//
//   - operations.token — the legacy per-Connection credential minted by
//     the retired /operation/init route. Phase 4 moved auth to the
//     per-job OperationJob.OperationToken column; nothing reads
//     operations.token anymore. Dropping it removes a varchar(255)
//     not-null column that EnsureOperationFromRequest had to populate
//     with a throwaway value to satisfy the constraint.
func (d *Database) dropDeprecatedColumns() error {
	type deprecatedColumn struct {
		model  any
		column string
	}
	deprecated := []deprecatedColumn{
		{model: &Operation{}, column: "token"},
	}
	migrator := d.Migrator()
	for _, dc := range deprecated {
		if !migrator.HasColumn(dc.model, dc.column) {
			continue
		}
		if err := migrator.DropColumn(dc.model, dc.column); err != nil {
			return fmt.Errorf("failed to drop column %T.%s: %w", dc.model, dc.column, err)
		}
	}
	return nil
}

// Reset drops all tables to start fresh.
func (d *Database) Reset() error {
	// Drop tables in an order that avoids foreign key conflicts.
	if err := d.Migrator().DropTable(
		&OperationLog{},
		&Operation{},
		&ConnectorRegistration{},
		&Subscription{},
		&OperationJob{},
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
