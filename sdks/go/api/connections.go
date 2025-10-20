package irmincore

import (
	"context"
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// CreateConnectionRequest represents the JSON request body for creating connections.
type CreateConnectionRequest struct {
	Name          string         `json:"name"                    validate:"required,max=100"              example:"Production MySQL Database"`
	Connector     string         `json:"connector"               validate:"required,validsqid=connectors" example:"conn_5p8q2n7m9x4k"`
	Description   string         `json:"description,omitempty"   validate:"max=500"                       example:"Primary MySQL database for production customer data"`
	Documentation string         `json:"documentation,omitempty" validate:"validdocumentation"            example:"# Production Database"`
	Details       map[string]any `json:"details"`  // Values for the required connector configuration as JSON object, like {"host":"db.example.com"}
	Settings      map[string]any `json:"settings"` // Values for the optional connector configuration as JSON object, like {"ssl_enabled":"true"}
}

// UpdateConnectionRequest represents the JSON request body for updating connections.
type UpdateConnectionRequest struct {
	Name          string         `json:"name,omitempty"          validate:"max=100"              example:"Production MySQL Database"`
	Connector     string         `json:"connector,omitempty"     validate:"validsqid=connectors" example:"conn_5p8q2n7m9x4k"`
	Description   string         `json:"description,omitempty"   validate:"max=500"              example:"Primary MySQL database for production customer data"`
	Documentation string         `json:"documentation,omitempty" validate:"validdocumentation"   example:"# Production Database"`
	Details       map[string]any `json:"details,omitempty"`  // Values for the required connector configuration as JSON object, like {"host":"db.example.com"}
	Settings      map[string]any `json:"settings,omitempty"` // Values for the optional connector configuration as JSON object, like {"ssl_enabled":"true"}
}

// TransferConnectionOwnershipRequest represents the JSON request body for transferring connection ownership.
type TransferConnectionOwnershipRequest struct {
	NewOwnerID string `json:"new_owner_id" validate:"required,validsqid=users" example:"usr_2k8n9q1m7p3x4z"`
}

func (c *Client) ListConnections(
	ctx context.Context,
	workspace string,
) ([]irminmodels.Connection, *irminmodels.IrminAPIResponse, error) {
	var connections []irminmodels.Connection
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/connections", workspace),
	}, &connections)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch connections error: %w", err)
	}
	return connections, apiResp, nil
}

func (c *Client) GetConnection(
	ctx context.Context,
	workspace, connectionID string,
) (*irminmodels.Connection, *irminmodels.IrminAPIResponse, error) {
	var connection irminmodels.Connection
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/connections/%s", workspace, connectionID),
	}, &connection)
	if err != nil {
		return nil, nil, fmt.Errorf("fetch connection error: %w", err)
	}
	return &connection, apiResp, nil
}

func (c *Client) CreateConnection(
	ctx context.Context,
	workspace string,
	req CreateConnectionRequest,
) (*irminmodels.Connection, *irminmodels.IrminAPIResponse, error) {
	var newConnection irminmodels.Connection
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/connections", workspace),
		ContentType: "application/json",
		Body:        req,
	}, &newConnection)
	if err != nil {
		return nil, nil, fmt.Errorf("create connection error: %w", err)
	}
	return &newConnection, apiResp, nil
}

func (c *Client) UpdateConnection(
	ctx context.Context,
	workspace, connectionID string,
	req UpdateConnectionRequest,
) (*irminmodels.Connection, *irminmodels.IrminAPIResponse, error) {
	var updatedConnection irminmodels.Connection
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/connections/%s", workspace, connectionID),
		ContentType: "application/json",
		Body:        req,
	}, &updatedConnection)
	if err != nil {
		return nil, nil, fmt.Errorf("update connection error: %w", err)
	}
	return &updatedConnection, apiResp, nil
}

// TransferConnection reassigns a connection to a new owner.
func (c *Client) TransferConnection(
	ctx context.Context,
	workspace, connectionID string,
	req TransferConnectionOwnershipRequest,
) (*irminmodels.Connection, *irminmodels.IrminAPIResponse, error) {
	var updatedConnection irminmodels.Connection
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/connections/%s/transfer-ownership", workspace, connectionID),
		ContentType: "application/json",
		Body:        req,
	}, &updatedConnection)
	if err != nil {
		return nil, nil, fmt.Errorf("connection ownership transfer error: %w", err)
	}
	return &updatedConnection, apiResp, nil
}

// DeleteConnection deletes a connection by its ID.
func (c *Client) DeleteConnection(
	ctx context.Context,
	workspace, connectionID string,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodDelete,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/connections/%s", workspace, connectionID),
		ContentType: "application/json",
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete connection error: %w", err)
	}
	return apiResp, nil
}

// GetConnectionSchema retrieves the schema for a specific connection and operation method.
func (c *Client) GetConnectionSchema(
	ctx context.Context,
	workspace, connectionID, operationMethod string,
) (*irminmodels.ObjectSchema, *irminmodels.IrminAPIResponse, error) {
	var connectionSchema irminmodels.ObjectSchema
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
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
