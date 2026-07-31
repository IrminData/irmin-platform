package duckdb

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"regexp"
	"sort"
	"strings"

	irminutils "github.com/IrminData/irmin-platform/sdks/go/utils"

	// Import DuckDB driver to register it with database/sql package.
	// The blank import is necessary as the driver needs to register itself
	// but we don't directly use any of its exported symbols.
	_ "github.com/marcboeker/go-duckdb"
)

// InMemoryClient is a client for interacting with DuckDB for in-memory data processing.
type InMemoryClient struct {
	db     *sql.DB
	logger *slog.Logger
}

// NewInMemoryClient creates a new client for in-memory data processing with DuckDB.
// It configures the DuckDB connection without external storage dependencies.
// Returns the client and an error if encountered.
func NewInMemoryClient(ctx context.Context, logger *slog.Logger) (*InMemoryClient, error) {
	// Open a connection to DuckDB using an in-memory database.
	db, err := sql.Open("duckdb", "")
	if err != nil {
		return nil, fmt.Errorf("failed to open DuckDB connection: %w", err)
	}

	client := &InMemoryClient{db: db, logger: logger}

	// Install optional extensions for enhanced functionality
	optionalExtensions := []string{
		"spatial",      // Provides Excel file reading capabilities via st_read()
		"avro",         // Support for Apache Avro files
		"delta",        // Support for Delta Lake format
		"iceberg",      // Support for Apache Iceberg format
		"autocomplete", // Enhanced autocomplete functionality
		"json",         // Enhanced JSON processing
		"vss",          // Vector Similarity Search for embeddings
	}
	client.installOptionalExtensions(ctx, optionalExtensions, logger)

	// Return the client.
	return client, nil
}

// installOptionalExtensions attempts to install and load optional DuckDB extensions.
// It logs warnings for any failures but doesn't return errors since these are optional.
func (c *InMemoryClient) installOptionalExtensions(ctx context.Context, extensions []string, logger *slog.Logger) {
	for _, ext := range extensions {
		installQuery := fmt.Sprintf("INSTALL %s;", ext)
		loadQuery := fmt.Sprintf("LOAD %s;", ext)

		_, installErr := c.db.ExecContext(ctx, installQuery)
		if installErr == nil {
			_, loadErr := c.db.ExecContext(ctx, loadQuery)
			if loadErr != nil {
				logger.WarnContext(ctx, "failed to load extension", "extension", ext, "error", loadErr)
			} else {
				logger.DebugContext(ctx, "successfully loaded extension", "extension", ext)
			}
		} else {
			logger.WarnContext(ctx, "failed to install extension", "extension", ext, "error", installErr)
		}
	}
}

// ExecuteQuery executes a SQL query using the client's DuckDB connection and returns the resulting rows.
// It is suitable for queries that return rows (e.g. SELECT statements).
//
// query: the SQL query to execute.
// args: optional arguments for the query.
func (c *InMemoryClient) ExecuteQuery(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
	// Execute the query and return the rows and any error encountered.
	rows, err := c.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	return rows, nil
}

// ExecuteNonQuery executes a SQL statement that does not return rows (such as INSERT, UPDATE, DELETE).
//
// query: the SQL statement to execute.
// args: optional arguments for the statement.
func (c *InMemoryClient) ExecuteNonQuery(ctx context.Context, query string, args ...any) (sql.Result, error) {
	// Execute the statement and return the result and any error encountered.
	result, err := c.db.ExecContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	return result, nil
}

// CreateTableFromData creates a table in DuckDB from in-memory data.
// This is useful for loading data directly into DuckDB for processing.
func (c *InMemoryClient) CreateTableFromData(ctx context.Context, tableName string, data []map[string]any) error {
	if len(data) == 0 {
		return fmt.Errorf("no data provided for table %s", tableName)
	}

	// Analyze the first row to determine column types
	firstRow := data[0]

	// Extract column names and sort them to ensure consistent ordering
	// between CREATE TABLE and INSERT statements
	var columnNames []string
	for key := range firstRow {
		columnNames = append(columnNames, key)
	}
	sort.Strings(columnNames)

	// Build column definitions with proper escaping
	var columns []string
	for _, key := range columnNames {
		value := firstRow[key]
		// Properly escape column name to handle quotes and special characters
		quotedKey := EscapeSQLIdentifier(key)
		columnDef := quotedKey
		switch value.(type) {
		case int, int32, int64:
			columnDef += " INTEGER"
		case float32, float64:
			columnDef += " DOUBLE"
		case bool:
			columnDef += " BOOLEAN"
		default:
			columnDef += " VARCHAR"
		}
		columns = append(columns, columnDef)
	}

	// Create the table
	createQuery, queryErr := buildCreateTableWithColumnsQuery(tableName, columns)
	if queryErr != nil {
		return fmt.Errorf("invalid table name: %w", queryErr)
	}
	if _, execErr := c.db.ExecContext(ctx, createQuery); execErr != nil {
		return fmt.Errorf("failed to create table %s: %w", tableName, execErr)
	}

	// Insert data
	for _, row := range data {
		var rowValues []any

		for _, colName := range columnNames {
			rowValues = append(rowValues, row[colName])
		}

		insertQuery, insertQueryErr := buildInsertQuery(tableName, len(rowValues))
		if insertQueryErr != nil {
			return fmt.Errorf("failed to build insert query: %w", insertQueryErr)
		}

		if _, insertErr := c.db.ExecContext(ctx, insertQuery, rowValues...); insertErr != nil {
			return fmt.Errorf("failed to insert data into table %s: %w", tableName, insertErr)
		}
	}

	return nil
}

// QueryToMap executes a query and returns the results as a slice of maps.
// This is convenient for working with query results in Go.
func (c *InMemoryClient) QueryToMap(ctx context.Context, query string, args ...any) ([]map[string]any, error) {
	rows, err := c.ExecuteQuery(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	var results []map[string]any
	for rows.Next() {
		values := make([]any, len(columns))
		valuePtrs := make([]any, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if scanErr := rows.Scan(valuePtrs...); scanErr != nil {
			return nil, scanErr
		}

		row := make(map[string]any)
		for i, col := range columns {
			row[col] = values[i]
		}
		results = append(results, row)
	}

	return results, rows.Err()
}

// Close closes the DuckDB connection held by the client.
func (c *InMemoryClient) Close() error {
	// Close the database connection.
	if err := c.db.Close(); err != nil {
		return err
	}
	return nil
}

// EscapeSQLIdentifier properly escapes a SQL identifier by doubling any internal quotes
// and wrapping the result in double quotes.
func EscapeSQLIdentifier(identifier string) string {
	// Escape any existing double quotes by doubling them
	escaped := strings.ReplaceAll(identifier, `"`, `""`)
	// Wrap in double quotes
	return fmt.Sprintf(`"%s"`, escaped)
}

// ValidateSQLIdentifier helps prevent SQL injection by ensuring only valid identifiers are used.
func ValidateSQLIdentifier(identifier string) (string, error) {
	// Check for valid SQL identifier (alphanumeric and underscore only)
	validIdentifier := regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`)
	if !validIdentifier.MatchString(identifier) {
		return "", fmt.Errorf("invalid SQL identifier: %s", identifier)
	}
	// Return quoted identifier to prevent SQL injection
	return fmt.Sprintf(`"%s"`, identifier), nil
}

// buildInsertQuery safely constructs an INSERT query for a table.
func buildInsertQuery(tableName string, placeholderCount int) (string, error) {
	safeTableName, err := ValidateSQLIdentifier(tableName)
	if err != nil {
		return "", err
	}

	// Build placeholders safely
	placeholders := make([]string, placeholderCount)
	for i := range placeholders {
		placeholders[i] = "?"
	}

	// Construct query safely using string concatenation with validated components
	query := "INSERT INTO " + safeTableName + " VALUES (" + strings.Join(placeholders, ", ") + ")"
	return query, nil
}

// buildCreateTableWithColumnsQuery safely constructs a CREATE TABLE query with column definitions.
func buildCreateTableWithColumnsQuery(tableName string, columnDefinitions []string) (string, error) {
	safeTableName, err := ValidateSQLIdentifier(tableName)
	if err != nil {
		return "", err
	}

	// Construct query safely using string concatenation with validated components
	query := "CREATE TABLE " + safeTableName + " (" + strings.Join(columnDefinitions, ", ") + ")"
	return query, nil
}

// EscapeSQLString escapes single quotes in SQL string literals by doubling them.
// This prevents SQL injection when interpolating strings into SQL queries.
// For example: "file'name.json" becomes "file"name.json"
func EscapeSQLString(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}

// IsStructuredFormat checks if a file extension represents a structured data format.
func IsStructuredFormat(extension string) bool {
	// Normalize extension
	ext := strings.ToLower(strings.TrimPrefix(extension, "."))

	supportedFormats := GetSupportedFormats()
	for _, format := range supportedFormats {
		if ext == format {
			return true
		}
	}
	return false
}

// GetContentTypeFromExtension returns the MIME type for a given file extension.
func GetContentTypeFromExtension(extension string) string {
	ext := strings.ToLower(extension)
	if !strings.HasPrefix(ext, ".") {
		ext = "." + ext
	}

	return irminutils.DetectMimeTypeByExtension("file" + ext)
}
