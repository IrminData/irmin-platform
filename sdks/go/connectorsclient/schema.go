package connectorsclient

import (
	"context"
	"fmt"
	"net/http"
	"net/url"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// GetSchema fetches the schema the connector exposes for a specific
// operation method (pull / push / patch) at the given resource path.
// Pass an empty path for the connector's root resource.
//
// Schema is cheap, request-scoped metadata and stays on the sync
// route; it does not go through the async job protocol.
//
// Requires an operation token on the Client.
func (c *Client) GetSchema(ctx context.Context, method, path string) (*irminmodels.ObjectSchema, error) {
	encodedMethod := url.PathEscape(method)
	encodedPath := url.QueryEscape(path)

	var schema irminmodels.ObjectSchema
	if err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/operation/schema/%s?path=%s", encodedMethod, encodedPath),
	}, &schema); err != nil {
		return nil, err
	}
	return &schema, nil
}
