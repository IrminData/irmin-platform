package duckdb

import (
	"database/sql"
	"fmt"
	"irmin-api/utils"
	"strings"

	_ "github.com/marcboeker/go-duckdb"
)

// Client is a client for interacting with DuckDB for querying data.
type QueryClient struct {
	db *sql.DB
}

// NewQueryClient creates a new client for querying data from LakeFS.
// It configures the DuckDB connection with the required S3 / LakeFS settings.
// Returns the client and an error if encountered.
func NewQueryClient() (*QueryClient, error) {
	// Load environment variables.
	env, err := utils.LoadEnv()
	if err != nil {
		return nil, fmt.Errorf("failed to load environment variables: %w", err)
	}

	// Open a connection to DuckDB (empty string uses an in-memory database).
	db, err := sql.Open("duckdb", "")
	if err != nil {
		return nil, fmt.Errorf("failed to open DuckDB connection: %w", err)
	}

	// Install and load HTTPFS extension.
	_, err = db.Exec("INSTALL httpfs; LOAD httpfs;")
	if err != nil {
		return nil, fmt.Errorf("failed to install and load httpfs extension: %w", err)
	}

	// Configure S3 / LakeFS connection secret.
	createCredentialsQuery := fmt.Sprintf(`
	CREATE SECRET lakefs_secret (
		TYPE s3,
		URL_STYLE 'path',
		KEY_ID '%s',
		SECRET '%s',
		REGION '%s',
		ENDPOINT '%s'
	);`,
		env.LakeFSAccessKey,
		env.LakeFSSecretKey,
		env.S3Region,
		strings.TrimPrefix(env.LakeFSURL, "https://"),
	)
	_, err = db.Exec(createCredentialsQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to create S3 / LakeFS credentials: %w", err)
	}
	// Return the client.
	return &QueryClient{
		db: db,
	}, nil
}

// ExecuteQuery executes a SQL query using the client's DuckDB connection and returns the resulting rows.
// It is suitable for queries that return rows (e.g. SELECT statements).
//
// query: the SQL query to execute.
// args: optional arguments for the query.
func (c *QueryClient) ExecuteQuery(query string, args ...any) (*sql.Rows, error) {
	// Execute the query and return the rows and any error encountered.
	rows, err := c.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	return rows, nil
}

// ExecuteNonQuery executes a SQL statement that does not return rows (such as INSERT, UPDATE, DELETE).
//
// query: the SQL statement to execute.
// args: optional arguments for the statement.
func (c *QueryClient) ExecuteNonQuery(query string, args ...any) (sql.Result, error) {
	// Execute the statement and return the result and any error encountered.
	result, err := c.db.Exec(query, args...)
	if err != nil {
		return nil, err
	}
	return result, nil
}

// Close closes the DuckDB connection held by the client.
func (c *QueryClient) Close() error {
	// Close the database connection.
	if err := c.db.Close(); err != nil {
		return err
	}
	return nil
}
