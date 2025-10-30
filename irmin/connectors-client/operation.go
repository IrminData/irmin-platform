package connectorsclient

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
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

// OperationLog represents a record of a log tied to an operation.
type OperationLog struct {
	CreatedAt string         `json:"created_at"`
	Type      string         `json:"type"`
	Message   string         `json:"message"`
	Metadata  map[string]any `json:"metadata"`
}

// OperationStatus represents the response for an operation status check.
type OperationStatus struct {
	OperationID   uint              `json:"operation_id"`
	Details       map[string]string `json:"details"`
	Settings      map[string]string `json:"settings"`
	Subscriptions []Subscription    `json:"subscriptions"`
	Logs          []OperationLog    `json:"logs"`
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

// CancelOperation cancels an operation with the connector.
// Cancellation is used to revoke the operation token and stop any ongoing processes, like event listeners.
//
// Note: System token is required for this operation.
//
// Parameters:
// - ctx: Context for request cancellation and timeout control.
// - operationID: The ID of the operation to cancel.
//
// Returns:
// - An error if the operation cannot be cancelled.
func (c *Client) CancelOperation(ctx context.Context, operationID uint) error {
	// Prepare form fields by formatting keys with the appropriate prefixes.
	formFields := map[string]string{
		"operation_id": strconv.FormatUint(uint64(operationID), 10),
	}

	// Send the POST request using FetchAPI with URL-encoded form fields.
	if err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/operation/cancel",
		FormFields:  formFields,
		ContentType: "application/x-www-form-urlencoded",
	}, nil); err != nil {
		return err
	}

	// Return nil if the operation was successfully cancelled.
	return nil
}

// GetOperationStatus retrieves the status of an operation with the connector.
//
// Note: System token is required for this operation.
//
// Parameters:
// - ctx: Context for request cancellation and timeout control.
// - operationID: The ID of the operation to get the status of.
//
// Returns:
// - The status of the operation if the request is successful.
// - An error if the operation cannot be retrieved.
func (c *Client) GetOperationStatus(ctx context.Context, operationID uint) (*OperationStatus, error) {
	formFields := map[string]string{
		"operation_id": strconv.FormatUint(uint64(operationID), 10),
	}

	var operationStatus OperationStatus

	if err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/operation/status",
		FormFields:  formFields,
		ContentType: "application/x-www-form-urlencoded",
	}, &operationStatus); err != nil {
		return nil, err
	}

	return &operationStatus, nil
}
