package tests

import (
	"context"

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

// TestOperationStatus, TestOperationStatusWithLogs, and TestOperationCancel
// used to exercise the form-bodied POST /operation/{status,cancel} endpoints
// on each connector. Those were deleted in Phase 2 of the async-pull rollout:
// status and cancel are now served at the top level by job_id under the
// async-job protocol (GET /operation/status/:job_id,
// POST /operation/cancel/:job_id), which is driven by Core, not by the
// per-connector e2e harness. Re-adding coverage belongs in Core's
// integration suite, not here.
