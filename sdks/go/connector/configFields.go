package irminConnectorClient

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// GetConfigFields fetches the configuration fields for a given configuration type.
//
// Note: System token is required for this operation.
//
// Parameters:
// - configType: The type of configuration, e.g. "details" or "settings".
// - details: A map containing prefilled configuration details (e.g. host, port, user, password, etc.).
// - settings: A map containing prefilled configuration settings (e.g. database, schema, table, etc.).
//
// Returns:
// - A list of DynamicField objects representing the configuration fields if the request is successful.
// - An error if the request fails.
func (c *Client) GetConfigFields(configType string, details map[string]string, settings map[string]string) (map[string]irminModels.DynamicField, error) {
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
	var fields map[string]irminModels.DynamicField

	// Send the POST request using FetchAPI with URL-encoded form fields.
	if err := c.FetchAPI(RequestOptions{
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

type ValidationResult struct {
	Ok                      bool     `json:"ok"`
	CanConnect              bool     `json:"can_connect"`
	ConnectionDetailsValid  bool     `json:"connection_details_valid"`
	ConnectionSettingsValid bool     `json:"connection_settings_valid"`
	Errors                  []string `json:"errors"`
}

// ValidateConfigFields validates the configuration fields provided by the user.
//
// Note: System token is required for this operation.
//
// Parameters:
// - details: A map containing configuration details provided by the user.
// - settings: A map containing configuration settings provided by the user.
//
// Returns:
// - A validation result from the connector if the request is successful.
// - An error if there is a problem with the request
func (c *Client) ValidateConfigFields(details map[string]string, settings map[string]string) (ValidationResult, error) {

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
	var result ValidationResult

	// Send the POST request using FetchAPI with URL-encoded form fields.
	if err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/configuration/validate",
		FormFields:  formFields,
		ContentType: "application/x-www-form-urlencoded",
	}, &result); err != nil {
		return ValidationResult{}, err
	}

	// Return the validation result or an error.
	return result, nil
}
