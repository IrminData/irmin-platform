package lib

import (
	"irmin-api/db"
	"irmin-api/duckdb"
	"irmin-api/utils"
	"log/slog"
	"os"
	"sync"
	"testing"
)

// TestSuite holds the test environment and database connection.
type TestSuite struct {
	DB           *db.Database
	Env          *utils.CoreAPIEnv
	Logger       *slog.Logger
	DuckDBClient *duckdb.QueryClient
}

var (
	// Global test suite instance.
	//nolint:gochecknoglobals // I've got no clue how to do this without globals
	globalTestSuite *TestSuite
	// Mutex to protect access to the global test suite.
	//nolint:gochecknoglobals // Once again, I've got no clue how to do this without globals
	globalTestSuiteMu sync.RWMutex
)

// GetTestSuite returns the global test suite instance.
// This is safe to call from any test function.
func GetTestSuite() *TestSuite {
	globalTestSuiteMu.RLock()
	defer globalTestSuiteMu.RUnlock()
	return globalTestSuite
}

// SetupTestSuite initializes the global test suite.
func SetupTestSuite(t *testing.T) error {
	globalTestSuiteMu.Lock()
	defer globalTestSuiteMu.Unlock()

	if globalTestSuite != nil {
		return nil // Already initialized
	}

	// Load test environment
	testEnv, err := utils.LoadEnv()
	if err != nil {
		if t != nil {
			t.Fatalf("Failed to load test environment: %v", err)
		}
		return err
	}

	// Create logger
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelError,
	}))

	// Create database connection
	testDB, err := db.InitialiseDB(testEnv)
	if err != nil {
		if t != nil {
			t.Fatalf("Failed to create test database: %v", err)
		}
		return err
	}

	// Create DuckDB client for data operations
	duckDBClient, err := duckdb.NewQueryClient(t.Context(), testEnv, logger)
	if err != nil {
		// Close the DB if DuckDB client fails
		testDB.Close()
		if t != nil {
			t.Fatalf("Failed to create DuckDB client: %v", err)
		}
		return err
	}

	globalTestSuite = &TestSuite{
		Logger:       logger,
		DB:           testDB,
		Env:          testEnv,
		DuckDBClient: duckDBClient,
	}

	return nil
}

// TeardownTestSuite cleans up the global test suite.
// This should be called from TestMain after all tests are done.
func TeardownTestSuite() {
	globalTestSuiteMu.Lock()
	defer globalTestSuiteMu.Unlock()

	if globalTestSuite == nil {
		return
	}

	// Close DuckDB client
	if globalTestSuite.DuckDBClient != nil {
		closeDuckDBClientErr := globalTestSuite.DuckDBClient.Close()
		if closeDuckDBClientErr != nil {
			globalTestSuite.Logger.Error("failed to close DuckDB client", "error", closeDuckDBClientErr)
		}
	}

	// Close database connection
	if globalTestSuite.DB != nil {
		globalTestSuite.DB.Close()
	}

	globalTestSuite = nil
}
