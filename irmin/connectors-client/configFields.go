package connectorsclient

import (
	"context"
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// GetConfigFields fetches the configuration fields for a given configuration type.
//
// Note: System token is required for this operation.
//
// Parameters:
// - ctx: Context for request cancellation and timeout control.
// - configType: The type of configuration, e.g. "details" or "settings".
// - details: A map containing prefilled configuration details (e.g. host, port, user, password, etc.).
// - settings: A map containing prefilled configuration settings (e.g. database, schema, table, etc.).
//
// Returns:
// - A list of DynamicField objects representing the configuration fields if the request is successful.
// - An error if the request fails.
func (c *Client) GetConfigFields(
	ctx context.Context,
	configType string,
	details map[string]string,
	settings map[string]string,
) (map[string]irminmodels.DynamicField, error) {
	// Build the endpoint URL using the provided configuration type.
	endpoint := fmt.Sprintf("/configuration/%s/fields", configType)

	// Prepare form fields by formatting keys with the appropriate prefixes.
	formFields := make(map[string]string)
	// Add details with keys in the format details[KEY].
	for key, value := range details {
		formFields[fmt.Sprintf("details[%s]", key)] = value
	}
	// Add settings with keys in the format settings[KEY].
	for key, value := range settings {
		formFields[fmt.Sprintf("settings[%s]", key)] = value
	}

	// Define a variable to hold the resulting configuration fields.
	var fields map[string]irminmodels.DynamicField

	// Send the POST request using FetchAPI with URL-encoded form fields.
	if err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		FormFields:  formFields,
		ContentType: "application/x-www-form-urlencoded",
	}, &fields); err != nil {
		return nil, err
	}

	// Return the configuration fields or an error.
	return fields, nil
}

// ValidateConfigFields validates the configuration fields provided by the user.
//
// Note: System token is required for this operation.
//
// Parameters:
// - ctx: Context for request cancellation and timeout control.
// - details: A map containing configuration details provided by the user.
// - settings: A map containing configuration settings provided by the user.
//
// Returns:
// - A validation result from the connector if the request is successful.
// - An error if there is a problem with the request.
func (c *Client) ValidateConfigFields(
	ctx context.Context,
	details map[string]string,
	settings map[string]string,
) (*irminmodels.ConnectorConfigurationValidationResult, error) {
	// Prepare form fields by formatting keys with the appropriate prefixes.
	formFields := make(map[string]string)
	// Add details with keys in the format details[KEY].
	for key, value := range details {
		formFields[fmt.Sprintf("details[%s]", key)] = value
	}
	// Add settings with keys in the format settings[KEY].
	for key, value := range settings {
		formFields[fmt.Sprintf("settings[%s]", key)] = value
	}

	// Define a variable to hold the validation result.
	var result irminmodels.ConnectorConfigurationValidationResult

	// Send the POST request using FetchAPI with URL-encoded form fields.
	err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/configuration/validate",
		FormFields:  formFields,
		ContentType: "application/x-www-form-urlencoded",
	}, &result)

	// Return the validation result and the error (if any).
	return &result, err
}
