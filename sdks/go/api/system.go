package irmincore

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// CallSystemWebhook calls the system webhook endpoint.
// The body is expected to be an that will be marshaled to JSON.
//
// Usable only with a system token.
func (c *Client) CallSystemWebhook(
	ctx context.Context,
	webhookType string,
	headers map[string]string,
	body any,
) (*irminmodels.IrminAPIResponse, error) {
	// Build the query params string
	queryParamsString := url.Values{}
	queryParamsString.Add("type", webhookType)

	// Call the endpoint
	var result any
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/system/webhook?%s", queryParamsString.Encode()),
		ContentType: "application/json",
		Body:        body,
		Headers:     headers,
	}, &result)
	if err != nil {
		return nil, fmt.Errorf("call system webhook error: %w", err)
	}
	return apiResp, nil
}

// GenerateFileSchema generates a schema from a file.
// The body is expected to be a multipart/form-data request with a file field.
//
// Usable only with a system token.
func (c *Client) GenerateFileSchema(
	ctx context.Context,
	fileName string,
	fileReader io.Reader,
) (*irminmodels.ObjectSchema, *irminmodels.IrminAPIResponse, error) {
	var result *irminmodels.ObjectSchema
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/system/schema-from-file",
		ContentType: "multipart/form-data",
		Files: []FormFile{
			{
				FieldName: "file",
				FileName:  fileName,
				Reader:    fileReader,
			},
		},
	}, &result)
	if err != nil {
		return nil, nil, fmt.Errorf("generate file schema error: %w", err)
	}
	return result, apiResp, nil
}
