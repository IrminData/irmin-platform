package tests

import (
	"context"

	"irmin-connectors/e2e-tests/helpers"
)

// TestInfo tests the /info endpoint of a connector.
func TestInfo(ctx context.Context, client *helpers.ConnectorClient) error {
	info, err := client.GetInfo(ctx)
	if err != nil {
		return err
	}

	// Validate the connector info structure
	if validateErr := helpers.AssertValidConnectorInfo(info); validateErr != nil {
		return validateErr
	}

	// Additional validation
	if authorErr := helpers.AssertNotEmpty(info.Author, "author"); authorErr != nil {
		return authorErr
	}

	if categoryErr := helpers.AssertNotEmpty(string(info.PrimaryCategory), "primary_category"); categoryErr != nil {
		return categoryErr
	}

	return nil
}
