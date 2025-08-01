package postgresclient

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresClient manages a pgxpool.Pool connection to Postgres.
// It may or may not be connected to a specific database, depending on how it's instantiated.
type PostgresClient struct {
	pool     *pgxpool.Pool
	host     string
	port     int
	user     string
	password string
	sslMode  bool
	dbName   string // May be empty if no specific database is chosen
}

// NewPostgresClient connects to Postgres without specifying a database.
// This is useful for listing available databases or validating credentials without
// "locking" into a specific dbName.
func NewPostgresClient(
	ctx context.Context,
	host string,
	port int,
	user, password, defaultDB string,
	sslMode bool,
) (*PostgresClient, error) {
	if host == "" || port == 0 || user == "" {
		return nil, errors.New("missing required connection details: host, port, user")
	}
	// Build the DSN without a database.
	var dsn string
	if sslMode {
		dsn = fmt.Sprintf(
			"host=%s port=%d user=%s password=%s dbname=%s sslmode=require",
			host, port, user, password, defaultDB,
		)
	} else {
		dsn = fmt.Sprintf(
			"host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
			host, port, user, password, defaultDB,
		)
	}

	poolConfig, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Postgres DSN: %w", err)
	}

	// Initialise a connection pool
	pool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create Postgres pool: %w", err)
	}

	// Test connectivity
	if err = pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("unable to connect to Postgres: %w", err)
	}

	return &PostgresClient{
		pool:     pool,
		host:     host,
		port:     port,
		user:     user,
		password: password,
		dbName:   defaultDB,
		sslMode:  sslMode,
	}, nil
}

// WithDatabase creates a new client instance *connected to a specific database*.
// This is handy once you decide which database you want to use (e.g. after listing them).
func (pc *PostgresClient) WithDatabase(ctx context.Context, dbName string) (*PostgresClient, error) {
	var dsn string
	if pc.sslMode {
		dsn = fmt.Sprintf(
			"host=%s port=%d user=%s password=%s dbname=%s sslmode=require",
			pc.host, pc.port, pc.user, pc.password, dbName,
		)
	} else {
		dsn = fmt.Sprintf(
			"host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
			pc.host, pc.port, pc.user, pc.password, dbName,
		)
	}

	poolConfig, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Postgres DSN with db=%s: %w", dbName, err)
	}

	newPool, err := pgxpool.NewWithConfig(ctx, poolConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create Postgres pool for db=%s: %w", dbName, err)
	}

	if err = newPool.Ping(ctx); err != nil {
		newPool.Close()
		return nil, fmt.Errorf("unable to connect to Postgres db=%s: %w", dbName, err)
	}

	return &PostgresClient{
		pool:     newPool,
		host:     pc.host,
		port:     pc.port,
		user:     pc.user,
		password: pc.password,
		sslMode:  pc.sslMode,
		dbName:   dbName,
	}, nil
}

// Close frees resources used by the connection pool.
func (pc *PostgresClient) Close() {
	if pc.pool != nil {
		pc.pool.Close()
	}
}

// ValidateCredentials pings the database server to ensure the connection is valid.
func (pc *PostgresClient) ValidateCredentials(ctx context.Context) error {
	if err := pc.pool.Ping(ctx); err != nil {
		return fmt.Errorf("invalid credentials or unable to connect: %w", err)
	}
	return nil
}

// GetAvailableDatabases returns a list of non-template databases, excluding 'postgres' as well.
func (pc *PostgresClient) GetAvailableDatabases(ctx context.Context) ([]string, error) {
	// Because we connected without specifying a dbName,
	// this query will run against the default connection (often "postgres").
	// We filter out 'template0', 'template1', 'postgres' etc. as desired.
	query := `
        SELECT datname
        FROM pg_database
        WHERE datistemplate = false
          AND datname NOT IN ('postgres')
        ORDER BY datname;
    `
	rows, err := pc.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve databases: %w", err)
	}
	defer rows.Close()

	var dbs []string
	for rows.Next() {
		var dbName string
		if err = rows.Scan(&dbName); err != nil {
			return nil, fmt.Errorf("scan error: %w", err)
		}
		dbs = append(dbs, dbName)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return dbs, nil
}

// Query performs a generic query returning rows.
// Remember to close the returned pgx.Rows when you're done with them.
func (pc *PostgresClient) Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
	if pc.dbName == "" {
		return nil, errors.New("cannot Query without a specific database - create a client with db first")
	}
	return pc.pool.Query(ctx, sql, args...)
}

// Exec performs a statement (INSERT/UPDATE/DELETE/DDL) that doesn't return rows.
func (pc *PostgresClient) Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
	if pc.dbName == "" {
		return pgconn.CommandTag{}, errors.New(
			"cannot Exec without a specific database - create a client with db first")
	}
	cmdTag, err := pc.pool.Exec(ctx, sql, args...)
	if err != nil {
		return cmdTag, fmt.Errorf("Exec error: %w", err)
	}
	return cmdTag, nil
}

// GetTables lists all table names in the 'public' schema of the current database.
// Must be invoked on a client that has a dbName selected (via WithDatabase).
func (pc *PostgresClient) GetTables(ctx context.Context) ([]string, error) {
	if pc.dbName == "" {
		return nil, errors.New("no database specified. Use .WithDatabase() first")
	}

	query := `
        SELECT tablename
        FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename;
    `
	rows, err := pc.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve tables: %w", err)
	}
	defer rows.Close()

	var tables []string
	for rows.Next() {
		var tableName string
		if err = rows.Scan(&tableName); err != nil {
			return nil, err
		}
		tables = append(tables, tableName)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}
	return tables, nil
}

// ColumnInfo holds metadata about a single column in a table.
type ColumnInfo struct {
	ColumnName string
	DataType   string
	IsNullable bool
}

// GetTableStructure returns a slice of ColumnInfo for the specified table.
func (pc *PostgresClient) GetTableStructure(ctx context.Context, tableName string) ([]ColumnInfo, error) {
	if pc.dbName == "" {
		return nil, errors.New("no database specified. Use .WithDatabase() first")
	}

	query := `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
    `
	rows, err := pc.pool.Query(ctx, query, tableName)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve structure for table '%s': %w", tableName, err)
	}
	defer rows.Close()

	var columns []ColumnInfo
	for rows.Next() {
		var col ColumnInfo
		var isNullableStr string
		if err = rows.Scan(&col.ColumnName, &col.DataType, &isNullableStr); err != nil {
			return nil, err
		}
		col.IsNullable = (isNullableStr == "YES")
		columns = append(columns, col)
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return columns, nil
}

// GetTablesAndStructures returns a map of tableName -> slice of ColumnInfo
// for all tables in the 'public' schema.
func (pc *PostgresClient) GetTablesAndStructures(ctx context.Context) (map[string][]ColumnInfo, error) {
	if pc.dbName == "" {
		return nil, errors.New("no database specified. Use .WithDatabase() first")
	}

	tables, err := pc.GetTables(ctx)
	if err != nil {
		return nil, err
	}

	result := make(map[string][]ColumnInfo)
	for _, t := range tables {
		var cols []ColumnInfo
		cols, err = pc.GetTableStructure(ctx, t)
		if err != nil {
			return nil, err
		}
		result[t] = cols
	}

	return result, nil
}

// Tx provides methods for executing queries within a PostgreSQL transaction.
// It wraps a pgx.Tx and also stores the pool connection so that it can be released
// on Commit or Rollback.
type Tx struct {
	pgxTx pgx.Tx
	conn  *pgxpool.Conn
}

// BeginTransaction acquires a connection from the pool and begins a database transaction.
// Remember to call either .Commit() or .Rollback() on the returned Tx to release the connection.
func (pc *PostgresClient) BeginTransaction(ctx context.Context) (*Tx, error) {
	if pc.dbName == "" {
		return nil, errors.New("cannot begin a transaction without specifying a database - use .WithDatabase() first")
	}

	conn, err := pc.pool.Acquire(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to acquire connection from pool: %w", err)
	}

	pgxTx, err := conn.Begin(ctx)
	if err != nil {
		conn.Release()
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}

	return &Tx{
		pgxTx: pgxTx,
		conn:  conn,
	}, nil
}

// Exec executes a query that does not return rows (e.g. INSERT/UPDATE/DELETE, DDL statements).
// This will be run inside the current transaction context.
func (t *Tx) Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error) {
	return t.pgxTx.Exec(ctx, sql, args...)
}

// QueryRow returns a single row from the transaction context,
// a convenience wrapper around pgxTx.QueryRow.
func (t *Tx) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	return t.pgxTx.QueryRow(ctx, sql, args...)
}

// Query executes a query that returns rows (e.g. SELECT). The caller is responsible
// for closing the returned pgx.Rows.
func (t *Tx) Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
	return t.pgxTx.Query(ctx, sql, args...)
}

// Commit commits the transaction and releases the underlying connection to the pool.
func (t *Tx) Commit(ctx context.Context) error {
	err := t.pgxTx.Commit(ctx)
	t.conn.Release() // Release the connection back to the pool
	return err
}

// Rollback aborts the transaction and releases the underlying connection to the pool.
// It is safe to call Rollback even if the transaction is already committed or rolled back.
func (t *Tx) Rollback(ctx context.Context) error {
	err := t.pgxTx.Rollback(ctx)
	t.conn.Release() // Release the connection back to the pool
	return err
}

// StartNotificationListener sets up a LISTEN on the given channel,
// then loops on WaitForNotification and calls onNotify(payload) when a notification arrives.
func (pc *PostgresClient) StartNotificationListener(
	ctx context.Context,
	logger *slog.Logger,
	channelName string,
	onNotify func(payload string),
) error {
	// Acquire a dedicated connection
	conn, err := pc.pool.Acquire(ctx)
	if err != nil {
		return fmt.Errorf("failed to acquire connection: %w", err)
	}

	// Release connection when ctx is cancelled
	go func() {
		<-ctx.Done()
		conn.Release()
	}()

	// Actually LISTEN on channel
	_, err = conn.Exec(ctx, "LISTEN "+channelName)
	if err != nil {
		conn.Release()
		return fmt.Errorf("failed to listen on channel %q: %w", channelName, err)
	}

	// Background goroutine to handle notifications
	go func() {
		for {
			var n *pgconn.Notification
			n, err = conn.Conn().WaitForNotification(ctx)
			if err != nil {
				// Usually context cancellation or network error
				logger.Error("Listener on channel %q stopped",
					"channel", channelName,
					"error", err)
				return
			}

			// Call the callback with the payload
			onNotify(n.Payload)
		}
	}()

	return nil
}
