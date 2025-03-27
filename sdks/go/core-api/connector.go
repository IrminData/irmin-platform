package irminCore

import (
	"fmt"
	"net/http"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListConnectors() ([]irminModels.Connector, *irminModels.IrminAPIResponse, error) {
	var connectors []irminModels.Connector
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/connectors",
	}, &connectors)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch connectors error: %w", err)
	}
	return connectors, apiResp, nil
}

func (c *Client) GetConnector(connectorID string) (*irminModels.Connector, *irminModels.IrminAPIResponse, error) {
	var connector irminModels.Connector
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/connectors/%s", connectorID),
	}, &connector)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch connector error: %w", err)
	}
	return &connector, apiResp, nil
}

func (c *Client) FetchConnectorConfigurationFields(
	connectorID, configType string,
	currentDetails map[string]string,
	currentSettings map[string]string,
) ([]irminModels.DynamicField, *irminModels.IrminAPIResponse, error) {
	form := map[string]string{}
	for key, value := range currentDetails {
		form[fmt.Sprintf("details[%s]", key)] = value
	}
	for key, value := range currentSettings {
		form[fmt.Sprintf("settings[%s]", key)] = value
	}

	var fields []irminModels.DynamicField
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/connectors/%s/fields/%s", connectorID, configType),
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, &fields)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch connector configuration fields error: %w", err)
	}
	return fields, apiResp, nil
}

func (c *Client) ValidateConnectorConfiguration(
	connectorID string,
	details map[string]string,
	settings map[string]string,
) (*irminModels.ConnectorConfigurationValidationResult, *irminModels.IrminAPIResponse, error) {
	form := map[string]string{}
	for key, value := range details {
		form[fmt.Sprintf("details[%s]", key)] = value
	}
	for key, value := range settings {
		form[fmt.Sprintf("settings[%s]", key)] = value
	}

	var validationResult irminModels.ConnectorConfigurationValidationResult
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/connectors/%s/validate", connectorID),
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  form,
	}, &validationResult)
	if err != nil {
		return nil, nil, fmt.Errorf("validate connector configuration error: %w", err)
	}
	return &validationResult, apiResp, nil
}

// RegisterNewConnector registers a new connector with the system. Requests to this endpoint must be authenticated with a system token.
func (c *Client) RegisterNewConnector(baseURL, systemToken string) (*irminModels.Connector, *irminModels.IrminAPIResponse, error) {
	var connector irminModels.Connector
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/connectors",
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"url":          baseURL,
			"system_token": systemToken,
		},
	}, &connector)
	if err != nil {
		return nil, nil, fmt.Errorf("register new connector error: %w", err)
	}
	return &connector, apiResp, nil
}

// UpdateRegisteredConnector updates the details of a registered connector. Requests to this endpoint must be authenticated with a system token.
func (c *Client) UpdateRegisteredConnector(connectorID, baseURL, systemToken string) (*irminModels.Connector, *irminModels.IrminAPIResponse, error) {
	var connector irminModels.Connector
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/connectors/%s", connectorID),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"url":          baseURL,
			"system_token": systemToken,
		},
	}, &connector)
	if err != nil {
		return nil, nil, fmt.Errorf("update registered connector error: %w", err)
	}
	return &connector, apiResp, nil
}

// DeleteConnector deletes a connector from the system. Requests to this endpoint must be authenticated with a system token.
func (c *Client) DeleteConnector(connectorID string) (*irminModels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/connectors/%s", connectorID),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete connector error: %w", err)
	}
	return apiResp, nil
}
