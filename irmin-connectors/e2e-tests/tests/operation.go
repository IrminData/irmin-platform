package tests

import (
	"context"
	"fmt"

	connectorsclient "irmin-connectors/e2e-tests/connectors-client"
	"irmin-connectors/e2e-tests/helpers"
)

// TestOperationInit tests the operation initialization endpoint.
// Returns the operation token for use in subsequent tests.
//
// Deprecated: Use TestOperationInitWithID instead to also get the operation ID.
func TestOperationInit(
	ctx context.Context,
	client *helpers.ConnectorClient,
	details, settings map[string]string,
) (string, error) {
	token, _, err := TestOperationInitWithID(ctx, client, details, settings)
	return token, err
}

// TestOperationInitWithID tests the operation initialization endpoint.
// Returns the operation token and ID for use in subsequent tests.
func TestOperationInitWithID(
	ctx context.Context,
	client *helpers.ConnectorClient,
	details, settings map[string]string,
) (string, uint, error) {
	operation, err := client.InitOperation(ctx, details, settings)
	if err != nil {
		return "", 0, err
	}

	if validateErr := helpers.AssertValidOperation(operation); validateErr != nil {
		return "", 0, validateErr
	}

	// Validate the details and settings were stored correctly
	if operation.Details == nil {
		return "", 0, &helpers.TestError{Message: "Expected operation details to be non-nil"}
	}

	if operation.Settings == nil {
		return "", 0, &helpers.TestError{Message: "Expected operation settings to be non-nil"}
	}

	return operation.Token, operation.ID, nil
}

// TestOperationStatus tests the operation status endpoint.
func TestOperationStatus(ctx context.Context, client *helpers.ConnectorClient, operationID uint) error {
	if operationID == 0 {
		return &helpers.TestError{Message: "Expected non-zero operation ID"}
	}

	// Get operation status
	status, err := client.GetOperationStatus(ctx, operationID)
	if err != nil {
		return err
	}

	// Validate the status response
	if status == nil {
		return &helpers.TestError{Message: "Expected non-nil operation status"}
	}

	if status.OperationID != operationID {
		return &helpers.TestError{Message: "Operation ID mismatch in status response"}
	}

	// Validate that details and settings are present
	if status.Details == nil {
		return &helpers.TestError{Message: "Expected operation status details to be non-nil"}
	}

	if status.Settings == nil {
		return &helpers.TestError{Message: "Expected operation status settings to be non-nil"}
	}

	return nil
}

// TestOperationStatusWithLogs tests the operation status endpoint and verifies logs are present.
func TestOperationStatusWithLogs(ctx context.Context, client *helpers.ConnectorClient, operationID uint) error {
	if operationID == 0 {
		return &helpers.TestError{Message: "Expected non-zero operation ID"}
	}

	// Get operation status
	status, err := client.GetOperationStatus(ctx, operationID)
	if err != nil {
		return err
	}

	// Validate the status response
	if status == nil {
		return &helpers.TestError{Message: "Expected non-nil operation status"}
	}

	// Validate operation logs
	if logErr := validateOperationLogs(status.Logs); logErr != nil {
		return logErr
	}

	return nil
}

// validateOperationLogs validates that operation logs have the expected structure.
func validateOperationLogs(logs []connectorsclient.OperationLog) error {
	// Logs may be empty for some operations, so we just validate structure if present
	for i, log := range logs {
		if log.Type == "" {
			return &helpers.TestError{Message: fmt.Sprintf("Expected non-empty log type at index %d", i)}
		}
		if log.CreatedAt == "" {
			return &helpers.TestError{Message: fmt.Sprintf("Expected non-empty log created_at at index %d", i)}
		}
		// Message can be empty in some cases, so we don't validate it
	}
	return nil
}

// TestOperationCancel tests the operation cancellation endpoint.
func TestOperationCancel(ctx context.Context, client *helpers.ConnectorClient, operationID uint) error {
	if operationID == 0 {
		return &helpers.TestError{Message: "Expected non-zero operation ID"}
	}

	// Cancel the operation
	err := client.CancelOperation(ctx, operationID)
	if err != nil {
		return err
	}

	return nil
}
