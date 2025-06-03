package lib_test

import (
	"irmin-api/lib"
	"os"
	"testing"
)

func TestMain(m *testing.M) {
	// Set up the test suite before running any tests
	lib.SetupTestSuite(nil)

	// Run all tests
	code := m.Run()

	// Clean up after all tests are done
	lib.TeardownTestSuite()

	os.Exit(code)
}
