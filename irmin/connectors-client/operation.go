package connectorsclient

import (
	"context"
	"fmt"
	"net/http"
)

// Operation represents a record of an initiated operation tied to a connector.
type Operation struct {
	ID                      uint              `json:"ID"                      example:"1"`
	CreatedAt               string            `json:"CreatedAt"               example:"2021-01-01T00:00:00Z"`
	UpdatedAt               string            `json:"UpdatedAt"               example:"2021-01-01T00:00:00Z"`
	DeletedAt               *string           `json:"DeletedAt,omitempty"     example:"2021-01-01T00:00:00Z"`
	Details                 map[string]string `json:"details"`  // Configuration (details) of the operation, formatted like {"database":"my_database","table":"my_table"}
	Settings                map[string]string `json:"settings"` // Configuration (settings) of the operation, formatted like {"database":"my_database","table":"my_table"}
	Token                   string            `json:"token"                   example:"1234567890"`
	ConfigHash              string            `json:"configHash"              example:"dad9439d003d075c99035d7d42521fbbc6f01758e2ba00559a56ff64c1fa0344"`
	ConnectorRegistrationID uint              `json:"connectorRegistrationID" example:"1"`
}

// InitOperation creates a new operation with the connector.
// The operation is used to store the configuration details and settings for a specific operation.
//
// Note: System token is required for this operation.
//
// Parameters:
// - ctx: Context for request cancellation and timeout control.
// - details: A map containing configuration details (e.g. host, port, user, password, etc.).
// - settings: A map containing configuration settings (e.g. database, schema, table, etc.).
//
// Returns:
// - The newly created operation if the request is successful.
// - An error if the request fails.
func (c *Client) InitOperation(
	ctx context.Context,
	details map[string]string,
	settings map[string]string,
) (*Operation, error) {
	// Prepare form fields by formatting keys with the appropriate prefixes.
	formFields := make(map[string]string)
	for key, value := range details {
		formFields[fmt.Sprintf("details[%s]", key)] = value
	}
	for key, value := range settings {
		formFields[fmt.Sprintf("settings[%s]", key)] = value
	}

	// Define a variable to hold the resulting configuration fields.
	var operation Operation

	// Send the POST request using FetchAPI with URL-encoded form fields.
	if err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/operation/init",
		FormFields:  formFields,
		ContentType: "application/x-www-form-urlencoded",
	}, &operation); err != nil {
		return nil, err
	}

	return &operation, nil
}
