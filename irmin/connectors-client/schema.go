package connectorsclient

import (
	"context"
	"fmt"
	"net/http"
	"net/url"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// GetSchema retrieves the schema for a specific operation method.
//
// Note: Operation token is required for this operation.
//
// Parameters:
// - method: The operation method for which to retrieve the schema, e.g. "pull", "push", etc.
// - path: The path within the connection to get schema for, empty string means the root path
//
// Returns:
// - The schema for the specified operation method if the request is successful.
// - An error if the request fails.
func (c *Client) GetSchema(ctx context.Context, method, path string) (*irminmodels.ObjectSchema, error) {
	// URL-encode the path parameter to handle special characters
	encodedPath := url.QueryEscape(path)

	var schema irminmodels.ObjectSchema
	if err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/operation/schema/%s?path=%s", method, encodedPath),
	}, &schema); err != nil {
		return nil, err
	}
	return &schema, nil
}
