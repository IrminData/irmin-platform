package tests

import (
	"context"
	"fmt"

	"irmin-connectors/e2e-tests/helpers"
)

// TestPull tests the pull capability of a connector.
func TestPull(ctx context.Context, client *helpers.ConnectorClient, pullPath string) error {
	files, err := client.OperationPull(ctx, pullPath)
	if err != nil {
		return err
	}

	if nilErr := helpers.AssertNotNil(files, "pulled files"); nilErr != nil {
		return nilErr
	}

	if len(files) == 0 {
		return &helpers.TestError{Message: "Expected at least one file from pull operation"}
	}

	// Validate each pulled file
	for i, file := range files {
		if len(file.Content) == 0 {
			return &helpers.TestError{Message: fmt.Sprintf("Expected non-empty content in pulled file at index %d", i)}
		}

		// Filename might be empty for some connectors, so we won't enforce it
		// but we'll check if content exists
	}

	return nil
}

// TestPullWithZipVerification tests pull and verifies the content is a valid ZIP archive.
func TestPullWithZipVerification(ctx context.Context, client *helpers.ConnectorClient, pullPath string) error {
	files, err := client.OperationPull(ctx, pullPath)
	if err != nil {
		return err
	}

	if len(files) == 0 {
		return &helpers.TestError{Message: "Expected at least one file from pull operation"}
	}

	// Verify each pulled file is a valid ZIP
	for i, file := range files {
		if len(file.Content) == 0 {
			return &helpers.TestError{Message: fmt.Sprintf("Expected non-empty content in pulled file at index %d", i)}
		}

		// Verify ZIP format
		if !helpers.IsValidZip(file.Content) {
			return &helpers.TestError{
				Message: fmt.Sprintf("Pulled file at index %d is not a valid ZIP archive", i),
			}
		}

		// Extract and verify contents
		extractedFiles, extractErr := helpers.ExtractZipContent(file.Content)
		if extractErr != nil {
			return &helpers.TestError{
				Message: fmt.Sprintf("Failed to extract ZIP content at index %d: %v", i, extractErr),
			}
		}

		if len(extractedFiles) == 0 {
			return &helpers.TestError{
				Message: fmt.Sprintf("ZIP archive at index %d contains no files", i),
			}
		}
	}

	return nil
}

// TestPullEmptyPath tests pulling with an empty path (should return all available data).
func TestPullEmptyPath(ctx context.Context, client *helpers.ConnectorClient) error {
	files, err := client.OperationPull(ctx, "")
	if err != nil {
		return err
	}

	// Empty path should return something (unless the connector has no data)
	// We just verify the operation succeeds without error
	if files == nil {
		return &helpers.TestError{Message: "Expected non-nil response from empty path pull"}
	}

	return nil
}

// TestPullSpecificPath tests pulling with a specific path.
func TestPullSpecificPath(ctx context.Context, client *helpers.ConnectorClient, specificPath string) error {
	if specificPath == "" {
		return &helpers.TestError{Message: "Specific path cannot be empty for this test"}
	}

	files, err := client.OperationPull(ctx, specificPath)
	if err != nil {
		return err
	}

	if len(files) == 0 {
		return &helpers.TestError{
			Message: fmt.Sprintf("Expected at least one file when pulling specific path: %s", specificPath),
		}
	}

	return nil
}
