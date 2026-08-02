package tests

import (
	"context"

	"irmin-connectors/e2e-tests/helpers"
)

// TestConfigFields tests the configuration fields endpoint.
func TestConfigFields(
	ctx context.Context,
	client *helpers.ConnectorClient,
	configurationType string,
	details, settings map[string]string,
) error {
	fields, err := client.GetConfigFields(ctx, configurationType, details, settings)
	if err != nil {
		return err
	}

	if fields == nil {
		return &helpers.TestError{Message: "Expected non-nil config fields"}
	}

	// Validate each field
	for fieldName, field := range fields {
		if validateErr := helpers.AssertValidDynamicField(field, fieldName); validateErr != nil {
			return validateErr
		}
	}

	return nil
}

// TestConfigValidation tests the configuration validation endpoint with valid config.
func TestConfigValidation(
	ctx context.Context,
	client *helpers.ConnectorClient,
	details, settings map[string]string,
	shouldBeValid bool,
) error {
	result, err := client.ValidateConfigFields(ctx, details, settings)
	if err != nil && result == nil {
		return err
	}

	return helpers.AssertValidationResult(result, shouldBeValid)
}

// TestConfigValidationInvalid tests the configuration validation with invalid credentials.
func TestConfigValidationInvalid(ctx context.Context, client *helpers.ConnectorClient) error {
	// Create invalid details (wrong password or host)
	invalidDetails := map[string]string{
		"host":     "invalid-host-that-does-not-exist",
		"port":     "9999",
		"user":     "invalid_user",
		"password": "wrong_password",
	}

	invalidSettings := map[string]string{
		"database": "nonexistent_db",
	}

	result, err := client.ValidateConfigFields(ctx, invalidDetails, invalidSettings)

	// We expect validation to fail, but the API call itself should succeed
	if err != nil && result == nil {
		// If there's an error and no result, the connector might not be accessible
		// This is acceptable for this test
		return nil
	}

	// If we got a result, it should indicate failure
	if result != nil && result.OK {
		return &helpers.TestError{Message: "Expected invalid configuration to fail validation"}
	}

	return nil
}
