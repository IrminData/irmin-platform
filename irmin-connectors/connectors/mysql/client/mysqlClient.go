package mysqlclient

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"time"

	// MySQL driver for database/sql.
	_ "github.com/go-sql-driver/mysql"
)

// Connection pool configuration constants.
const (
	MaxOpenConnections  = 25
	MaxIdleConnections  = 5
	ConnectionLifetime  = 5 * time.Minute
	ChangeCheckInterval = 30 * time.Second
)

// MySQLClient manages a sql.DB connection to MySQL.
// It may or may not be connected to a specific database, depending on how it's instantiated.
type MySQLClient struct {
	db       *sql.DB
	host     string
	port     int
	user     string
	password string
	dbName   string // May be empty if no specific database is chosen
}

// NewMySQLClient connects to MySQL without specifying a database.
// This is useful for listing available databases or validating credentials without
// "locking" into a specific dbName.
func NewMySQLClient(
	ctx context.Context,
	host string,
	port int,
	user, password, defaultDB string,
) (*MySQLClient, error) {
	if host == "" || port == 0 || user == "" {
		return nil, errors.New("missing required connection details: host, port, user")
	}

	// Build the DSN
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true&multiStatements=true",
		user, password, host, port, defaultDB)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open MySQL connection: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(MaxOpenConnections)
	db.SetMaxIdleConns(MaxIdleConnections)
	db.SetConnMaxLifetime(ConnectionLifetime)

	// Test connectivity
	if err = db.PingContext(ctx); err != nil {
		if closeErr := db.Close(); closeErr != nil {
			return nil, fmt.Errorf("failed to ping MySQL and close connection: %w (original error: %w)", closeErr, err)
		}
		return nil, fmt.Errorf("unable to connect to MySQL: %w", err)
	}

	return &MySQLClient{
		db:       db,
		host:     host,
		port:     port,
		user:     user,
		password: password,
		dbName:   defaultDB,
	}, nil
}

// WithDatabase creates a new client instance *connected to a specific database*.
// This is handy once you decide which database you want to use (e.g. after listing them).
func (mc *MySQLClient) WithDatabase(ctx context.Context, dbName string) (*MySQLClient, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true&multiStatements=true",
		mc.user, mc.password, mc.host, mc.port, dbName)

	newDB, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open MySQL connection with db=%s: %w", dbName, err)
	}

	// Configure connection pool
	newDB.SetMaxOpenConns(MaxOpenConnections)
	newDB.SetMaxIdleConns(MaxIdleConnections)
	newDB.SetConnMaxLifetime(ConnectionLifetime)

	if err = newDB.PingContext(ctx); err != nil {
		if closeErr := newDB.Close(); closeErr != nil {
			return nil, fmt.Errorf(
				"failed to ping MySQL db=%s and close connection: %w (original error: %w)",
				dbName,
				closeErr,
				err,
			)
		}
		return nil, fmt.Errorf("unable to connect to MySQL db=%s: %w", dbName, err)
	}

	return &MySQLClient{
		db:       newDB,
		host:     mc.host,
		port:     mc.port,
		user:     mc.user,
		password: mc.password,
		dbName:   dbName,
	}, nil
}

// Close frees resources used by the database connection.
func (mc *MySQLClient) Close() error {
	if mc.db != nil {
		return mc.db.Close()
	}
	return nil
}

// ValidateCredentials pings the database server to ensure the connection is valid.
func (mc *MySQLClient) ValidateCredentials(ctx context.Context) error {
	if err := mc.db.PingContext(ctx); err != nil {
		return fmt.Errorf("invalid credentials or unable to connect: %w", err)
	}
	return nil
}

// GetAvailableDatabases returns a list of databases, excluding system databases.
func (mc *MySQLClient) GetAvailableDatabases(ctx context.Context) ([]string, error) {
	query := `
        SHOW DATABASES;
    `
	rows, err := mc.db.QueryContext(ctx, query)
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
		// Exclude system databases
		if dbName != "information_schema" && dbName != "mysql" && dbName != "performance_schema" && dbName != "sys" {
			dbs = append(dbs, dbName)
		}
	}
	if rows.Err() != nil {
		return nil, rows.Err()
	}

	return dbs, nil
}

// Query performs a generic query returning rows.
// Remember to close the returned *sql.Rows when you're done with them.
func (mc *MySQLClient) Query(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
	if mc.dbName == "" {
		return nil, errors.New("cannot Query without a specific database - create a client with db first")
	}
	return mc.db.QueryContext(ctx, query, args...)
}

// Exec performs a statement (INSERT/UPDATE/DELETE/DDL) that doesn't return rows.
func (mc *MySQLClient) Exec(ctx context.Context, query string, args ...any) (sql.Result, error) {
	if mc.dbName == "" {
		return nil, errors.New("cannot Exec without a specific database - create a client with db first")
	}
	result, err := mc.db.ExecContext(ctx, query, args...)
	if err != nil {
		return result, fmt.Errorf("Exec error: %w", err)
	}
	return result, nil
}

// GetTables lists all table names in the current database.
// Must be invoked on a client that has a dbName selected (via WithDatabase).
func (mc *MySQLClient) GetTables(ctx context.Context) ([]string, error) {
	if mc.dbName == "" {
		return nil, errors.New("no database specified. Use .WithDatabase() first")
	}

	query := `
        SHOW TABLES;
    `
	rows, err := mc.db.QueryContext(ctx, query)
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
func (mc *MySQLClient) GetTableStructure(ctx context.Context, tableName string) ([]ColumnInfo, error) {
	if mc.dbName == "" {
		return nil, errors.New("no database specified. Use .WithDatabase() first")
	}

	query := `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = ? AND table_name = ?
        ORDER BY ordinal_position;
    `
	rows, err := mc.db.QueryContext(ctx, query, mc.dbName, tableName)
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
// for all tables in the current database.
func (mc *MySQLClient) GetTablesAndStructures(ctx context.Context) (map[string][]ColumnInfo, error) {
	if mc.dbName == "" {
		return nil, errors.New("no database specified. Use .WithDatabase() first")
	}

	tables, err := mc.GetTables(ctx)
	if err != nil {
		return nil, err
	}

	result := make(map[string][]ColumnInfo)
	for _, t := range tables {
		var cols []ColumnInfo
		cols, err = mc.GetTableStructure(ctx, t)
		if err != nil {
			return nil, err
		}
		result[t] = cols
	}

	return result, nil
}

// Tx provides methods for executing queries within a MySQL transaction.
type Tx struct {
	sqlTx *sql.Tx
}

// BeginTransaction begins a database transaction.
// Remember to call either .Commit() or .Rollback() on the returned Tx.
func (mc *MySQLClient) BeginTransaction(ctx context.Context) (*Tx, error) {
	if mc.dbName == "" {
		return nil, errors.New("cannot begin a transaction without specifying a database - use .WithDatabase() first")
	}

	sqlTx, err := mc.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}

	return &Tx{
		sqlTx: sqlTx,
	}, nil
}

// Exec executes a query that does not return rows (e.g. INSERT/UPDATE/DELETE, DDL statements).
// This will be run inside the current transaction context.
func (t *Tx) Exec(ctx context.Context, query string, args ...any) (sql.Result, error) {
	return t.sqlTx.ExecContext(ctx, query, args...)
}

// QueryRow returns a single row from the transaction context.
func (t *Tx) QueryRow(ctx context.Context, query string, args ...any) *sql.Row {
	return t.sqlTx.QueryRowContext(ctx, query, args...)
}

// Query executes a query that returns rows (e.g. SELECT). The caller is responsible
// for closing the returned *sql.Rows.
func (t *Tx) Query(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
	return t.sqlTx.QueryContext(ctx, query, args...)
}

// Commit commits the transaction.
func (t *Tx) Commit() error {
	return t.sqlTx.Commit()
}

// Rollback aborts the transaction.
// It is safe to call Rollback even if the transaction is already committed or rolled back.
func (t *Tx) Rollback() error {
	return t.sqlTx.Rollback()
}

// StartBinlogListener sets up a polling-based change listener for MySQL.
// This implementation uses MySQL's timestamp-based change detection instead of binlog.
func (mc *MySQLClient) StartBinlogListener(
	ctx context.Context,
	logger *slog.Logger,
	onNotify func(payload string),
) error {
	if mc.dbName == "" {
		return errors.New("cannot start listener without a specific database")
	}

	logger.InfoContext(ctx, "Starting MySQL polling-based change listener",
		"database", mc.dbName,
		"interval", ChangeCheckInterval)

	// Setup change tracking table if it doesn't exist
	if err := mc.setupChangeTracking(ctx); err != nil {
		return fmt.Errorf("failed to setup change tracking: %w", err)
	}

	// Start polling for changes
	go func() {
		ticker := time.NewTicker(ChangeCheckInterval)
		defer ticker.Stop()

		lastCheck := time.Now()

		for {
			select {
			case <-ctx.Done():
				logger.InfoContext(ctx, "MySQL change listener stopped")
				return
			case <-ticker.C:
				changes, err := mc.checkForChanges(ctx, lastCheck)
				if err != nil {
					logger.ErrorContext(ctx, "Error checking for changes",
						"error", err)
					continue
				}

				// Process each change
				for _, change := range changes {
					payload := fmt.Sprintf(`{"table_name":"%s","event_type":"change","id":"%s","timestamp":"%s"}`,
						change.TableName, change.ID, change.Timestamp.Format(time.RFC3339))
					onNotify(payload)
				}

				lastCheck = time.Now()
			}
		}
	}()

	return nil
}

// ChangeRecord represents a detected change in MySQL.
type ChangeRecord struct {
	TableName string
	ID        string
	Timestamp time.Time
}

// setupChangeTracking creates necessary infrastructure for change tracking.
func (mc *MySQLClient) setupChangeTracking(ctx context.Context) error {
	// Create the irmin_change_log table if it doesn't exist
	if err := mc.createChangeLogTable(ctx); err != nil {
		return fmt.Errorf("failed to create change log table: %w", err)
	}

	// Get all tables in the current database
	tables, err := mc.GetTables(ctx)
	if err != nil {
		return fmt.Errorf("failed to get tables: %w", err)
	}

	// Create triggers for each table (excluding the change log table itself)
	for _, tableName := range tables {
		if tableName == "irmin_change_log" {
			continue // Skip the change log table itself
		}
		if createErr := mc.createTriggersForTable(ctx, tableName); createErr != nil {
			return fmt.Errorf("failed to create triggers for table %s: %w", tableName, createErr)
		}
	}

	return nil
}

// checkForChanges polls for recent changes in the database using the change log table.
func (mc *MySQLClient) checkForChanges(ctx context.Context, since time.Time) ([]ChangeRecord, error) {
	query := `
		SELECT table_name, row_id, changed_at
		FROM irmin_change_log
		WHERE changed_at > ?
		ORDER BY changed_at ASC
	`

	rows, err := mc.Query(ctx, query, since)
	if err != nil {
		return nil, fmt.Errorf("failed to query change log: %w", err)
	}
	defer rows.Close()

	var changes []ChangeRecord
	for rows.Next() {
		var change ChangeRecord
		if scanErr := rows.Scan(&change.TableName, &change.ID, &change.Timestamp); scanErr != nil {
			return nil, fmt.Errorf("failed to scan change record: %w", scanErr)
		}
		changes = append(changes, change)
	}

	if rowErr := rows.Err(); rowErr != nil {
		return nil, fmt.Errorf("error iterating over change records: %w", rowErr)
	}

	return changes, nil
}
