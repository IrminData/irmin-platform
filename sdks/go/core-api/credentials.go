package irmincore

import (
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// CreateCredentialRequest represents the JSON request body for creating API credentials.
type CreateCredentialRequest struct {
	Name   string `json:"name"   validate:"required"`
	Expiry int    `json:"expiry" validate:"required"` // Seconds until expiry
}

func (c *Client) ListTokens() ([]irminmodels.APIToken, *irminmodels.IrminAPIResponse, error) {
	var tokens []irminmodels.APIToken
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/credentials",
	}, &tokens)
	if err != nil {
		return nil, nil, fmt.Errorf("get system tokens error: %w", err)
	}
	return tokens, apiResp, nil
}

func (c *Client) CreateToken(
	req CreateCredentialRequest,
) (*irminmodels.APIToken, *irminmodels.IrminAPIResponse, error) {
	var token irminmodels.APIToken
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/v1/credentials",
		ContentType: "application/json",
		Body:        req,
	}, &token)
	if err != nil {
		return nil, nil, fmt.Errorf("create system token error: %w", err)
	}
	return &token, apiResp, nil
}

func (c *Client) DeleteToken(tokenID string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(RequestOptions{
		Method:      http.MethodDelete,
		Endpoint:    fmt.Sprintf("/v1/credentials/%s", tokenID),
		ContentType: "application/json",
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("revoke system token error: %w", err)
	}
	return apiResp, nil
}
