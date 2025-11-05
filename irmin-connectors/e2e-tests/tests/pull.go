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
