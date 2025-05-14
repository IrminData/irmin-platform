package irmincore

import (
	"fmt"
	"net/http"
	"net/url"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// CallSystemWebhook calls the system webhook endpoint.
// The body is expected to be an that will be marshaled to JSON.
//
// Usable only with a system token.
func (c *Client) CallSystemWebhook(
	queryParams map[string]string,
	headers map[string]string,
	body any,
) (*irminmodels.IrminAPIResponse, error) {
	// Build the query params string
	queryParamsString := url.Values{}
	for k, v := range queryParams {
		queryParamsString.Add(k, v)
	}

	// Call the endpoint
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/system/webhook?%s", queryParamsString.Encode()),
		ContentType: "application/json",
		Body:        body,
		Headers:     headers,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("call system webhook error: %w", err)
	}
	return apiResp, nil
}

// CallSystemDispatch calls the system dispatch endpoint.
// The body is expected to be an that will be marshaled to JSON.
//
// Usable only with a system token.
func (c *Client) CallSystemDispatch(
	queryParams map[string]string,
	headers map[string]string,
	body any,
) (*irminmodels.IrminAPIResponse, error) {
	// Build the query params string
	queryParamsString := url.Values{}
	for k, v := range queryParams {
		queryParamsString.Add(k, v)
	}

	// Call the endpoint
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/system/dispatch?%s", queryParamsString.Encode()),
		ContentType: "application/json",
		Body:        body,
		Headers:     headers,
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("call system dispatch error: %w", err)
	}
	return apiResp, nil
}
