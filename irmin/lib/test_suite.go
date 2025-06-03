package lib

import (
	"irmin-api/db"
	"irmin-api/utils"
	"sync"
	"testing"
)

// TestSuite holds the test environment and database connection.
type TestSuite struct {
	DB  *db.Database
	Env *utils.CoreAPIEnv
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
// This should be called from TestMain.
func SetupTestSuite(t *testing.T) {
	globalTestSuiteMu.Lock()
	defer globalTestSuiteMu.Unlock()

	if globalTestSuite != nil {
		t.Fatal("Test suite already initialized")
	}

	// Load test environment
	testEnv, err := utils.LoadEnv()
	if err != nil {
		t.Fatalf("Failed to load test environment: %v", err)
	}

	// Create database connection
	testDB, err := db.InitialiseDB(testEnv)
	if err != nil {
		t.Fatalf("Failed to create test database: %v", err)
	}

	globalTestSuite = &TestSuite{
		DB:  testDB,
		Env: testEnv,
	}
}

// TeardownTestSuite cleans up the global test suite.
// This should be called from TestMain after all tests are done.
func TeardownTestSuite() {
	globalTestSuiteMu.Lock()
	defer globalTestSuiteMu.Unlock()

	if globalTestSuite == nil {
		return
	}

	// Close database connection
	if globalTestSuite.DB != nil {
		globalTestSuite.DB.Close()
	}

	globalTestSuite = nil
}

// WithTestSuite is a helper function that provides access to the test suite.
// This is maintained for backward compatibility but should be phased out.
func WithTestSuite(t *testing.T, fn func(ts *TestSuite)) {
	ts := GetTestSuite()
	if ts == nil {
		t.Fatal("Test suite not initialized. Make sure SetupTestSuite is called in TestMain")
	}
	fn(ts)
}
