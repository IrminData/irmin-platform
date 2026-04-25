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
// route; it does not go through the async job protocol. Details and
// Settings are nevertheless required: post-Phase-4, the connector
// service upserts the matching Operation row on every data route
// (including schema) so the worker can read credentials on
// connector-specific schema introspection. Pass the same maps the
// caller would pass to StartOperation*.
func (c *Client) GetSchema(
	ctx context.Context,
	method, path string,
	details, settings map[string]string,
) (*irminmodels.ObjectSchema, error) {
	encodedMethod := url.PathEscape(method)
	encodedPath := url.QueryEscape(path)

	formFields := buildDetailsSettingsForm(details, settings)
	contentType := ""
	if len(formFields) > 0 {
		contentType = contentTypeFormURLEncoded
	}

	var schema irminmodels.ObjectSchema
	if err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/operation/schema/%s?path=%s", encodedMethod, encodedPath),
		FormFields:  formFields,
		ContentType: contentType,
	}, &schema); err != nil {
		return nil, err
	}
	return &schema, nil
}
