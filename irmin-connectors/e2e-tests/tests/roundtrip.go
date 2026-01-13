package tests

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"

	connectorsclient "irmin-connectors/e2e-tests/connectors-client"
	"irmin-connectors/e2e-tests/helpers"
)

// roundTripTestData holds the prepared test data for a round-trip test.
type roundTripTestData struct {
	zipPath      string
	testFileName string
	testData     []byte
}

// prepareRoundTripTestData prepares test data for round-trip testing.
// If pushFile exists, it will be used; otherwise sample CSV data is generated.
func prepareRoundTripTestData(pushFile string) (*roundTripTestData, error) {
	// Use configured push file if it exists
	if pushFile != "" {
		if _, err := os.Stat(pushFile); err == nil {
			return prepareFromFile(pushFile)
		}
	}

	// Fall back to sample data
	return prepareFromSampleData()
}

// prepareFromFile creates test data from an existing file.
func prepareFromFile(pushFile string) (*roundTripTestData, error) {
	zipPath, err := helpers.WrapFileInZip(pushFile)
	if err != nil {
		return nil, fmt.Errorf("failed to wrap push file in zip: %w", err)
	}

	testData, _ := os.ReadFile(pushFile)

	return &roundTripTestData{
		zipPath:      zipPath,
		testFileName: filepath.Base(pushFile),
		testData:     testData,
	}, nil
}

// prepareFromSampleData creates test data from sample CSV data.
func prepareFromSampleData() (*roundTripTestData, error) {
	testData := helpers.CreateSampleCSVData()
	testFileName := "roundtrip-test.csv"

	zipPath, err := helpers.CreateZipFileWithContent(testFileName, testData)
	if err != nil {
		return nil, fmt.Errorf("failed to create test zip file: %w", err)
	}

	return &roundTripTestData{
		zipPath:      zipPath,
		testFileName: testFileName,
		testData:     testData,
	}, nil
}

// findMatchingFile looks for the test file in extracted files.
// Returns true if found, along with any content mismatch error.
func findMatchingFile(
	extractedFiles map[string][]byte,
	testFileName string,
	testData []byte,
) (bool, error) {
	testFileExt := filepath.Ext(testFileName)

	for fileName, fileContent := range extractedFiles {
		// Check exact filename match
		if helpers.FileNameMatches(fileName, testFileName) {
			if !helpers.ContentSimilar(testData, fileContent) {
				return true, &helpers.TestError{
					Message: fmt.Sprintf(
						"Round-trip content mismatch for file %s: pushed %d bytes, got %d bytes",
						fileName, len(testData), len(fileContent),
					),
				}
			}
			return true, nil
		}

		// For vector connectors, accept any parquet file with content
		if testFileExt == ".parquet" && filepath.Ext(fileName) == ".parquet" && len(fileContent) > 0 {
			return true, nil
		}
	}

	return false, nil
}

// TestRoundTrip tests pushing data and then pulling it back to verify integrity.
// This is a comprehensive test that validates the full data lifecycle.
// If pushFile is provided and exists, it will be used instead of generating sample data.
func TestRoundTrip(
	ctx context.Context,
	client *helpers.ConnectorClient,
	pushPath string,
	pushFile string,
) error {
	// Prepare test data
	testData, err := prepareRoundTripTestData(pushFile)
	if err != nil {
		return err
	}
	defer func() {
		_ = helpers.CleanupTestFile(testData.zipPath)
	}()

	// Push the data to the connector
	formFile := helpers.CreateFormFile(testData.zipPath, "file")
	if _, pushErr := client.OperationPush(ctx, pushPath, formFile); pushErr != nil {
		return fmt.Errorf("push operation failed: %w", pushErr)
	}

	// Pull the data back
	pulledFiles, pullErr := client.OperationPull(ctx, pushPath)
	if pullErr != nil {
		return fmt.Errorf("pull operation failed: %w", pullErr)
	}

	// Validate pulled data
	return validatePulledFiles(pulledFiles, testData.testFileName, testData.testData)
}

// validatePulledFiles validates the files returned from a pull operation.
func validatePulledFiles(pulledFiles []connectorsclient.PulledFile, testFileName string, testData []byte) error {
	if len(pulledFiles) == 0 {
		return &helpers.TestError{Message: "Expected at least one file from pull operation after push"}
	}

	if len(pulledFiles[0].Content) == 0 {
		return &helpers.TestError{Message: "Pulled file has empty content after push - potential data loss"}
	}

	extractedFiles, extractErr := helpers.ExtractZipContent(pulledFiles[0].Content)
	if extractErr != nil {
		return fmt.Errorf("failed to extract pulled ZIP content: %w", extractErr)
	}

	if len(extractedFiles) == 0 {
		return &helpers.TestError{Message: "No files found in pulled ZIP archive"}
	}

	found, contentErr := findMatchingFile(extractedFiles, testFileName, testData)
	if contentErr != nil {
		return contentErr
	}

	if !found {
		var availableFiles []string
		for fileName := range extractedFiles {
			availableFiles = append(availableFiles, fileName)
		}
		return &helpers.TestError{
			Message: fmt.Sprintf(
				"Test file '%s' not found in pulled archive. Available files: %v",
				testFileName, availableFiles,
			),
		}
	}

	return nil
}

// TestRoundTripWithVerification performs a detailed round-trip test with content verification.
func TestRoundTripWithVerification(
	ctx context.Context,
	client *helpers.ConnectorClient,
	pushPath string,
	expectedContent []byte,
) error {
	// Push the provided content
	zipPath, createErr := helpers.CreateZipFileWithContent("test-data.csv", expectedContent)
	if createErr != nil {
		return fmt.Errorf("failed to create test zip file: %w", createErr)
	}
	defer func() {
		_ = helpers.CleanupTestFile(zipPath)
	}()

	formFile := helpers.CreateFormFile(zipPath, "file")
	if _, pushErr := client.OperationPush(ctx, pushPath, formFile); pushErr != nil {
		return fmt.Errorf("push operation failed: %w", pushErr)
	}

	// Pull back and verify
	pulledFiles, pullErr := client.OperationPull(ctx, pushPath)
	if pullErr != nil {
		return fmt.Errorf("pull operation failed: %w", pullErr)
	}

	if len(pulledFiles) == 0 {
		return &helpers.TestError{Message: "No files returned from pull after push"}
	}

	if len(pulledFiles[0].Content) == 0 {
		return &helpers.TestError{Message: "Pulled file has empty content after push - potential data loss"}
	}

	extractedFiles, extractErr := helpers.ExtractZipContent(pulledFiles[0].Content)
	if extractErr != nil {
		return fmt.Errorf("failed to extract pulled content: %w", extractErr)
	}

	if len(extractedFiles) == 0 {
		return &helpers.TestError{Message: "No files found in pulled ZIP archive"}
	}

	// Verify at least one file has matching content
	for _, fileContent := range extractedFiles {
		if bytes.Equal(expectedContent, fileContent) || helpers.ContentSimilar(expectedContent, fileContent) {
			return nil
		}
	}

	return &helpers.TestError{
		Message: fmt.Sprintf(
			"Content verification failed: expected content not found in %d pulled files",
			len(extractedFiles),
		),
	}
}
