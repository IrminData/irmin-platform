package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// ConnectorRequest represents the JSON request body for creating/updating connectors.
type ConnectorRequest struct {
	URL         string `json:"url"          validate:"required,validurl" example:"https://example.com/connector"`
	SystemToken string `json:"system_token" validate:"required,max=100"  example:"system_token_123"`
}

// ConnectorConfigurationRequest represents the JSON request body for connector configuration operations.
type ConnectorConfigurationRequest struct {
	Details  map[string]any `json:"details"`  // Values for the required connector configuration as JSON object, like {"host":"db.example.com"}
	Settings map[string]any `json:"settings"` // Values for the optional connector configuration as JSON object, like {"ssl_enabled":"true"}
}

func (c *Client) ListConnectors() ([]irminmodels.Connector, *irminmodels.IrminAPIResponse, error) {
	var connectors []irminmodels.Connector
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/connectors",
	}, &connectors)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch connectors error: %w", err)
	}
	return connectors, apiResp, nil
}

func (c *Client) GetConnector(connectorID string) (*irminmodels.Connector, *irminmodels.IrminAPIResponse, error) {
	var connector irminmodels.Connector
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
) ([]irminmodels.DynamicField, *irminmodels.IrminAPIResponse, error) {
	form := map[string]string{}
	for key, value := range currentDetails {
		form[fmt.Sprintf("details[%s]", key)] = value
	}
	for key, value := range currentSettings {
		form[fmt.Sprintf("settings[%s]", key)] = value
	}

	var fields []irminmodels.DynamicField
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
	req ConnectorConfigurationRequest,
) (*irminmodels.ConnectorConfigurationValidationResult, *irminmodels.IrminAPIResponse, error) {
	var validationResult irminmodels.ConnectorConfigurationValidationResult
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/connectors/%s/validate", connectorID),
		ContentType: "application/json",
		Body:        req,
	}, &validationResult)
	if err != nil {
		return nil, nil, fmt.Errorf("validate connector configuration error: %w", err)
	}
	return &validationResult, apiResp, nil
}

// RegisterNewConnector registers a new connector with the system. Requests to this endpoint must be authenticated with a system token.
func (c *Client) RegisterNewConnector(
	req ConnectorRequest,
) (*irminmodels.Connector, *irminmodels.IrminAPIResponse, error) {
	var connector irminmodels.Connector
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/connectors",
		ContentType: "application/json",
		Body:        req,
	}, &connector)
	if err != nil {
		return nil, nil, fmt.Errorf("register new connector error: %w", err)
	}
	return &connector, apiResp, nil
}

// UpdateRegisteredConnector updates the details of a registered connector. Requests to this endpoint must be authenticated with a system token.
func (c *Client) UpdateRegisteredConnector(
	connectorID string,
	req ConnectorRequest,
) (*irminmodels.Connector, *irminmodels.IrminAPIResponse, error) {
	var connector irminmodels.Connector
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/connectors/%s", connectorID),
		ContentType: "application/json",
		Body:        req,
	}, &connector)
	if err != nil {
		return nil, nil, fmt.Errorf("update registered connector error: %w", err)
	}
	return &connector, apiResp, nil
}

// DeleteConnector deletes a connector from the system. Requests to this endpoint must be authenticated with a system token.
func (c *Client) DeleteConnector(connectorID string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodDelete,
		Endpoint: fmt.Sprintf("/v1/connectors/%s", connectorID),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete connector error: %w", err)
	}
	return apiResp, nil
}
