package irminCore

import (
	"fmt"
	"net/http"
	"strconv"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

func (c *Client) ListTokens() ([]irminModels.APIToken, *irminModels.IrminAPIResponse, error) {
	var tokens []irminModels.APIToken
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/credentials",
	}, &tokens)
	if err != nil {
		return nil, nil, fmt.Errorf("get system tokens error: %w", err)
	}
	return tokens, apiResp, nil
}

func (c *Client) CreateToken(name string, expiry int) (*irminModels.APIToken, *irminModels.IrminAPIResponse, error) {
	var token irminModels.APIToken
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/credentials",
		ContentType: "application/x-www-form-urlencoded",
		FormFields: map[string]string{
			"name":   name,
			"expiry": strconv.FormatInt(int64(expiry), 10),
		},
	}, &token)
	if err != nil {
		return nil, nil, fmt.Errorf("create system token error: %w", err)
	}
	return &token, apiResp, nil
}

func (c *Client) DeleteToken(tokenID string) (*irminModels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodDelete,
		Endpoint:    fmt.Sprintf("/v1/credentials/%s", tokenID),
		ContentType: "application/x-www-form-urlencoded",
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("revoke system token error: %w", err)
	}
	return apiResp, nil
}
