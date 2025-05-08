package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListConnections(workspace string) ([]irminmodels.Connection, *irminmodels.IrminAPIResponse, error) {
	var connections []irminmodels.Connection
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/connections", workspace),
	}, &connections)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch connections error: %w", err)
	}
	return connections, apiResp, nil
}

func (c *Client) GetConnection(
	workspace, connectionID string,
) (*irminmodels.Connection, *irminmodels.IrminAPIResponse, error) {
	var connection irminmodels.Connection
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/connections/%s", workspace, connectionID),
	}, &connection)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch connection error: %w", err)
	}
	return &connection, apiResp, nil
}

func (c *Client) CreateConnection(
	workspace, connectorID, name, description, documentation string,
	connectionDetails, connectionSettings map[string]string,
) (*irminmodels.Connection, *irminmodels.IrminAPIResponse, error) {
	fields := map[string]string{
		"connector":     connectorID,
		"name":          name,
		"description":   description,
		"documentation": documentation,
	}
	for key, value := range connectionDetails {
		fields[fmt.Sprintf("details[%s]", key)] = value
	}
	for key, value := range connectionSettings {
		fields[fmt.Sprintf("settings[%s]", key)] = value
	}

	var newConnection irminmodels.Connection
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/connections", workspace),
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  fields,
	}, &newConnection)
	if err != nil {
		return nil, nil, fmt.Errorf("create connection error: %w", err)
	}
	return &newConnection, apiResp, nil
}

func (c *Client) UpdateConnection(
	workspace, connectionID, connectorID, name, description, documentation string,
	connectionDetails, connectionSettings map[string]string,
) (*irminmodels.Connection, *irminmodels.IrminAPIResponse, error) {
	fields := map[string]string{
		"connector":     connectorID,
		"name":          name,
		"description":   description,
		"documentation": documentation,
	}
	for key, value := range connectionDetails {
		fields[fmt.Sprintf("details[%s]", key)] = value
	}
	for key, value := range connectionSettings {
		fields[fmt.Sprintf("settings[%s]", key)] = value
	}
	var updatedConnection irminmodels.Connection
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/connections/%s", workspace, connectionID),
		ContentType: "application/x-www-form-urlencoded",
		FormFields:  fields,
	}, &updatedConnection)
	if err != nil {
		return nil, nil, fmt.Errorf("update connection error: %w", err)
	}
	return &updatedConnection, apiResp, nil
}

// TransferConnection reassigns a connection to a new owner.
func (c *Client) TransferConnection(
	workspace, connectionID, newOwnerID string,
) (*irminmodels.Connection, *irminmodels.IrminAPIResponse, error) {
	var updatedConnection irminmodels.Connection
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/connections/%s/transfer-ownership", workspace, connectionID),
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"new_owner_id": newOwnerID,
		},
	}, &updatedConnection)
	if err != nil {
		return nil, nil, fmt.Errorf("connection ownership transfer error: %w", err)
	}
	return &updatedConnection, apiResp, nil
}

// DeleteConnection deletes a connection by its ID.
func (c *Client) DeleteConnection(workspace, connectionID string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodDelete,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/connections/%s", workspace, connectionID),
		ContentType: "application/x-www-form-urlencoded",
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete connection error: %w", err)
	}
	return apiResp, nil
}

// GetConnectionSchema retrieves the schema for a specific connection and operation method.
func (c *Client) GetConnectionSchema(
	workspace, connectionID, operationMethod string,
) (*irminmodels.ObjectSchema, *irminmodels.IrminAPIResponse, error) {
	var connectionSchema irminmodels.ObjectSchema
	apiResp, err := c.FetchAPI(RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/connections/%s/schema?operation_method=%s",
			workspace,
			connectionID,
			operationMethod,
		),
	}, &connectionSchema)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch connection schema error: %w", err)
	}
	return &connectionSchema, apiResp, nil
}
