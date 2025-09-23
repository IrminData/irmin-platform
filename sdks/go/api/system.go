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
	webhookType string,
	headers map[string]string,
	body any,
) (*irminmodels.IrminAPIResponse, error) {
	// Build the query params string
	queryParamsString := url.Values{}
	queryParamsString.Add("type", webhookType)

	// Call the endpoint
	var result any
	apiResp, err := c.FetchAPI(RequestOptions{
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
