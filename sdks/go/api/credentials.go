package irmincore

import (
	"context"
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// CreateCredentialRequest represents the JSON request body for creating API credentials.
type CreateCredentialRequest struct {
	Name   string `json:"name"   validate:"required,max=100" example:"API Token"`
	Expiry int    `json:"expiry" validate:"required"         example:"3600"` // Seconds until expiry
}

func (c *Client) ListTokens(ctx context.Context) ([]irminmodels.APIToken, *irminmodels.IrminAPIResponse, error) {
	var tokens []irminmodels.APIToken
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: "/v1/credentials",
	}, &tokens)
	if err != nil {
		return nil, nil, fmt.Errorf("get system tokens error: %w", err)
	}
	return tokens, apiResp, nil
}

func (c *Client) CreateToken(
	ctx context.Context,
	req CreateCredentialRequest,
) (*irminmodels.APIToken, *irminmodels.IrminAPIResponse, error) {
	var token irminmodels.APIToken
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
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

func (c *Client) DeleteToken(ctx context.Context, tokenID string) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodDelete,
		Endpoint:    fmt.Sprintf("/v1/credentials/%s", tokenID),
		ContentType: "application/json",
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("revoke system token error: %w", err)
	}
	return apiResp, nil
}
