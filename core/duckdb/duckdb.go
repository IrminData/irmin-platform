package duckdb

import (
	"context"
	"database/sql"
	"fmt"
	"irmin-api/utils"
	"log/slog"
	"strings"

	// Import DuckDB driver to register it with database/sql package.
	// The blank import is necessary as the driver needs to register itself
	// but we don't directly use any of its exported symbols.
	_ "github.com/marcboeker/go-duckdb"
)

// QueryClient is a client for interacting with DuckDB for querying data.
type QueryClient struct {
	db     *sql.DB
	logger *slog.Logger
}

func requiredExtensions() []string {
	return []string{"httpfs", "excel", "spatial"}
}

func optionalExtensions() []string {
	return []string{"avro", "delta", "iceberg", "autocomplete", "vss"}
}

// InstallRuntimeExtensions installs DuckDB extensions once during process or
// image startup. Request-scoped clients only load the already installed files.
func InstallRuntimeExtensions(
	ctx context.Context,
	skipOptional bool,
	logger *slog.Logger,
) error {
	database, err := sql.Open("duckdb", "")
	if err != nil {
		return fmt.Errorf("open DuckDB extension installer: %w", err)
	}
	defer database.Close()
	for _, extension := range requiredExtensions() {
		if _, installErr := database.ExecContext(ctx, "INSTALL "+extension); installErr != nil {
			return fmt.Errorf("install required DuckDB extension %s: %w", extension, installErr)
		}
	}
	if skipOptional {
		return nil
	}
	for _, extension := range optionalExtensions() {
		if _, installErr := database.ExecContext(ctx, "INSTALL "+extension); installErr != nil {
			logger.WarnContext(
				ctx,
				"failed to install optional DuckDB extension",
				"extension",
				extension,
				"error",
				installErr,
			)
		}
	}
	return nil
}

// NewQueryClient creates a new client for querying data from LakeFS.
// It configures the DuckDB connection with the required S3 / LakeFS settings.
// Returns the client and an error if encountered.
func NewQueryClient(ctx context.Context, env *utils.CoreAPIEnv, logger *slog.Logger) (*QueryClient, error) {
	// Open a connection to DuckDB (empty string uses an in-memory database).
	db, err := sql.Open("duckdb", "")
	if err != nil {
		return nil, fmt.Errorf("failed to open DuckDB connection: %w", err)
	}

	// Runtime extensions are installed at process/image startup.
	_, err = db.ExecContext(ctx, "LOAD httpfs;")
	if err != nil {
		return nil, fmt.Errorf("failed to install and load httpfs extension: %w", err)
	}

	client := &QueryClient{db: db, logger: logger}

	// Only try to install optional extensions if SkipOptionalExtensions is false
	if !env.SkipOptionalDuckDBExtensions {
		client.loadOptionalExtensions(ctx, append([]string{"spatial"}, optionalExtensions()...), logger)
	} else {
		logger.DebugContext(ctx, "skipping optional extensions installation")
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
	_, err = db.ExecContext(ctx, createCredentialsQuery)
	if err != nil {
		return nil, fmt.Errorf("failed to create S3 / LakeFS credentials: %w", err)
	}
	// Return the client.
	return client, nil
}

// loadOptionalExtensions attempts to load extensions installed at startup.
func (c *QueryClient) loadOptionalExtensions(ctx context.Context, extensions []string, logger *slog.Logger) {
	for _, ext := range extensions {
		loadQuery := fmt.Sprintf("LOAD %s;", ext)
		_, loadErr := c.db.ExecContext(ctx, loadQuery)
		if loadErr != nil {
			logger.WarnContext(ctx, "failed to load extension", "extension", ext, "error", loadErr)
		} else {
			logger.DebugContext(ctx, "successfully loaded extension", "extension", ext)
		}
	}
}

// ExecuteQuery executes a SQL query using the client's DuckDB connection and returns the resulting rows.
// It is suitable for queries that return rows (e.g. SELECT statements).
//
// query: the SQL query to execute.
// args: optional arguments for the query.
func (c *QueryClient) ExecuteQuery(ctx context.Context, query string, args ...any) (*sql.Rows, error) {
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
func (c *QueryClient) ExecuteNonQuery(ctx context.Context, query string, args ...any) (sql.Result, error) {
	// Execute the statement and return the result and any error encountered.
	result, err := c.db.ExecContext(ctx, query, args...)
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
