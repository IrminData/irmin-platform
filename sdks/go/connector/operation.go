package irminConnectorClient

import (
	"fmt"
	"net/http"
	"strconv"
)

// Operation represents a record of an initiated operation tied to a connector.
type Operation struct {
	ID                      uint              `json:"ID"`
	CreatedAt               string            `json:"CreatedAt"`
	UpdatedAt               string            `json:"UpdatedAt"`
	DeletedAt               *string           `json:"DeletedAt,omitempty"`
	Details                 map[string]string `json:"details"`
	Settings                map[string]string `json:"settings"`
	Token                   string            `json:"token"`
	ConnectorRegistrationID uint              `json:"connectorRegistrationID"`
}

// InitOperation creates a new operation with the connector.
// The operation is used to store the configuration details and settings for a specific operation.
//
// Note: System token is required for this operation.
//
// Parameters:
// - details: A map containing configuration details (e.g. host, port, user, password, etc.).
// - settings: A map containing configuration settings (e.g. database, schema, table, etc.).
//
// Returns:
// - The newly created operation if the request is successful.
// - An error if the request fails.
func (c *Client) InitOperation(details map[string]string, settings map[string]string) (*Operation, error) {
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
	if err := c.FetchAPI(RequestOptions{
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
// - operation_id: The ID of the operation to cancel.
//
// Returns:
// - An error if the operation cannot be cancelled.
func (c *Client) CancelOperation(operation_id int) error {

	// Prepare form fields by formatting keys with the appropriate prefixes.
	formFields := map[string]string{
		"operation_id": strconv.FormatInt(int64(operation_id), 10),
	}

	// Send the POST request using FetchAPI with URL-encoded form fields.
	if err := c.FetchAPI(RequestOptions{
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
