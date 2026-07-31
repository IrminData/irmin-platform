package connectorsclient

import (
	"context"
	"fmt"
	"net/http"
	"net/url"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// GetConfigFields fetches the configuration fields for a given
// configuration type (e.g. "details", "settings"). The details and
// settings maps carry any prefilled values the connector's field
// resolver can use to derive dependent fields.
//
// Requires a system token on the Client.
func (c *Client) GetConfigFields(
	ctx context.Context,
	configType string,
	details map[string]string,
	settings map[string]string,
) (map[string]irminmodels.DynamicField, error) {
	endpoint := fmt.Sprintf("/configuration/%s/fields", url.PathEscape(configType))
	formFields := buildDetailsSettingsForm(details, settings)

	var fields map[string]irminmodels.DynamicField
	if err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    endpoint,
		FormFields:  formFields,
		ContentType: "application/x-www-form-urlencoded",
	}, &fields); err != nil {
		return nil, err
	}
	return fields, nil
}

// ValidateConfigFields asks the connector to validate a full
// configuration payload (details + settings) against its rules,
// typically right before saving a Connection.
//
// Requires a system token on the Client.
func (c *Client) ValidateConfigFields(
	ctx context.Context,
	details map[string]string,
	settings map[string]string,
) (*irminmodels.ConnectorConfigurationValidationResult, error) {
	formFields := buildDetailsSettingsForm(details, settings)

	var result irminmodels.ConnectorConfigurationValidationResult
	if err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/configuration/validate",
		FormFields:  formFields,
		ContentType: "application/x-www-form-urlencoded",
	}, &result); err != nil {
		// Match the nil-on-error convention of every other method in
		// this package (GetInfo, GetConfigFields, GetSchema,
		// SubscribeToChanges). Handing back a zero-value pointer on
		// error lets callers that check the pointer before the error
		// silently proceed with bogus validation state.
		return nil, err
	}
	return &result, nil
}

// buildDetailsSettingsForm emits form fields with the `details[KEY]`
// and `settings[KEY]` prefixes the connector service expects. Kept
// separate so both config field endpoints share one canonical encoder.
func buildDetailsSettingsForm(details, settings map[string]string) map[string]string {
	formFields := make(map[string]string, len(details)+len(settings))
	for key, value := range details {
		formFields[fmt.Sprintf("details[%s]", key)] = value
	}
	for key, value := range settings {
		formFields[fmt.Sprintf("settings[%s]", key)] = value
	}
	return formFields
}
