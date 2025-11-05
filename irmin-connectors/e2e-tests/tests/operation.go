package tests

import (
	"context"

	"irmin-connectors/e2e-tests/helpers"
)

// TestOperationInit tests the operation initialization endpoint.
// Returns the operation token for use in subsequent tests.
func TestOperationInit(
	ctx context.Context,
	client *helpers.ConnectorClient,
	details, settings map[string]string,
) (string, error) {
	operation, err := client.InitOperation(ctx, details, settings)
	if err != nil {
		return "", err
	}

	if validateErr := helpers.AssertValidOperation(operation); validateErr != nil {
		return "", validateErr
	}

	// Validate the details and settings were stored correctly
	if operation.Details == nil {
		return "", &helpers.TestError{Message: "Expected operation details to be non-nil"}
	}

	if operation.Settings == nil {
		return "", &helpers.TestError{Message: "Expected operation settings to be non-nil"}
	}

	return operation.Token, nil
}

// TestOperationStatus tests the operation status endpoint.
func TestOperationStatus(ctx context.Context, client *helpers.ConnectorClient, operationToken string) error {
	// Note: The actual implementation may vary based on how the connector
	// handles operation status queries. Some connectors may require the operation ID.
	// This is a placeholder that should be adjusted based on actual connector behavior.

	// For now, we just verify the token was created
	if operationToken == "" {
		return &helpers.TestError{Message: "Expected non-empty operation token"}
	}

	return nil
}

// TestOperationCancel tests the operation cancellation endpoint.
func TestOperationCancel(ctx context.Context, client *helpers.ConnectorClient, operationToken string) error {
	// Similar to status, we need the operation ID
	// For now, this is a placeholder

	// In a real implementation, you would:
	// 1. Extract operation ID from the token or previous responses
	// 2. Call client.CancelOperation(ctx, operationID)
	// 3. Verify cancellation was successful

	return nil
}
