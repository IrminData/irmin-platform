package tests

import (
	"context"
	"os"
	"strings"

	"irmin-connectors/e2e-tests/helpers"
)

// TestPush tests the push capability of a connector.
func TestPush(ctx context.Context, client *helpers.ConnectorClient, pushPath, pushFile string) error {
	// Create test data
	var testFilePath string
	var cleanupNeeded bool

	// Check if pushFile is provided and if it's already a ZIP file
	switch {
	case pushFile != "" && fileExists(pushFile) && isZipFile(pushFile):
		// Use the provided ZIP file
		testFilePath = pushFile
	case pushFile != "" && fileExists(pushFile):
		// File exists but is not a ZIP - wrap it in a ZIP archive
		zipPath, wrapErr := helpers.WrapFileInZip(pushFile)
		if wrapErr != nil {
			return wrapErr
		}
		testFilePath = zipPath
		cleanupNeeded = true
	default:
		// No file provided or file doesn't exist - create sample data
		zipPath, createErr := helpers.CreateSampleZipFile("test-push-data.zip")
		if createErr != nil {
			return createErr
		}
		testFilePath = zipPath
		cleanupNeeded = true
	}

	// Ensure cleanup
	if cleanupNeeded {
		defer func() {
			_ = helpers.CleanupTestFile(testFilePath)
		}()
	}

	// Create form file
	formFile := helpers.CreateFormFile(testFilePath, "file")

	// Push the file
	response, err := client.OperationPush(ctx, pushPath, formFile)
	if err != nil {
		return err
	}

	// Validate response
	if response == "" {
		return &helpers.TestError{Message: "Expected non-empty response from push operation"}
	}

	return nil
}

// isZipFile checks if a file has a .zip extension (case-insensitive).
func isZipFile(path string) bool {
	return strings.HasSuffix(strings.ToLower(path), ".zip")
}

// fileExists checks if a file exists.
func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
