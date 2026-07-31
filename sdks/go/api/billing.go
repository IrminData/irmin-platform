package irmincore

import (
	"context"
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
)

// CheckoutRequest represents the JSON request body for creating a checkout session (adding a payment method).
type CheckoutRequest struct {
	ReturnURL string `json:"return_url" validate:"required" example:"https://app.irmin.io/workspace/my-workspace/settings/billing/success"`
}

// CheckoutResponse represents the response body for checkout endpoints.
type CheckoutResponse struct {
	CheckoutURL string `json:"checkout_url" example:"https://polar.sh/checkout/abc123"`
}

// PortalResponse represents the response body for the billing portal endpoint.
type PortalResponse struct {
	PortalURL string `json:"portal_url" example:"https://polar.sh/portal/abc123"`
}

// GetSubscription retrieves the current billing subscription for a workspace.
func (c *Client) GetSubscription(
	ctx context.Context,
	workspaceSlug string,
) (*irminmodels.PlanInfo, *irminmodels.IrminAPIResponse, error) {
	var plan irminmodels.PlanInfo
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/billing/subscription", workspaceSlug),
	}, &plan)
	if err != nil {
		return nil, nil, fmt.Errorf("get subscription error: %w", err)
	}
	return &plan, apiResp, nil
}

// GetUsage retrieves current period usage for a workspace.
func (c *Client) GetUsage(
	ctx context.Context,
	workspaceSlug string,
) ([]irminmodels.UsageDimensionInfo, *irminmodels.IrminAPIResponse, error) {
	var usage []irminmodels.UsageDimensionInfo
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/billing/usage", workspaceSlug),
	}, &usage)
	if err != nil {
		return nil, nil, fmt.Errorf("get usage error: %w", err)
	}
	return usage, apiResp, nil
}

// GetUsageHistory retrieves usage history for a workspace over multiple billing periods.
func (c *Client) GetUsageHistory(
	ctx context.Context,
	workspaceSlug string,
	periods int,
) ([]irminmodels.UsageHistoryEntry, *irminmodels.IrminAPIResponse, error) {
	var history []irminmodels.UsageHistoryEntry
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/billing/usage/history?periods=%d", workspaceSlug, periods),
	}, &history)
	if err != nil {
		return nil, nil, fmt.Errorf("get usage history error: %w", err)
	}
	return history, apiResp, nil
}

// UpdateBillingInfoRequest represents the request body for updating billing info.
type UpdateBillingInfoRequest struct {
	Name           *string                      `json:"name,omitempty"            validate:"omitnil,max=256"`
	BillingAddress *irminmodels.BillingAddress  `json:"billing_address,omitempty"`
	TaxID          irminmodels.BillingInfoTaxID `json:"tax_id,omitempty"          validate:"omitnil,len=2"`
}

// GetBillingInfo retrieves billing info for a workspace.
func (c *Client) GetBillingInfo(
	ctx context.Context,
	workspaceSlug string,
) (*irminmodels.BillingInfo, *irminmodels.IrminAPIResponse, error) {
	var info irminmodels.BillingInfo
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodGet,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/billing/info", workspaceSlug),
	}, &info)
	if err != nil {
		return nil, nil, fmt.Errorf("get billing info error: %w", err)
	}
	return &info, apiResp, nil
}

// UpdateBillingInfo updates billing info for a workspace.
func (c *Client) UpdateBillingInfo(
	ctx context.Context,
	workspaceSlug string,
	req UpdateBillingInfoRequest,
) (*irminmodels.BillingInfo, *irminmodels.IrminAPIResponse, error) {
	var info irminmodels.BillingInfo
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPatch,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/billing/info", workspaceSlug),
		ContentType: "application/json",
		Body:        req,
	}, &info)
	if err != nil {
		return nil, nil, fmt.Errorf("update billing info error: %w", err)
	}
	return &info, apiResp, nil
}

// CreateCheckout creates a Polar checkout session for a workspace.
func (c *Client) CreateCheckout(
	ctx context.Context,
	workspaceSlug string,
	req CheckoutRequest,
) (*CheckoutResponse, *irminmodels.IrminAPIResponse, error) {
	var checkout CheckoutResponse
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/billing/checkout", workspaceSlug),
		ContentType: "application/json",
		Body:        req,
	}, &checkout)
	if err != nil {
		return nil, nil, fmt.Errorf("create checkout error: %w", err)
	}
	return &checkout, apiResp, nil
}

// CreatePortalSession creates a Polar customer portal session and returns its URL.
func (c *Client) CreatePortalSession(
	ctx context.Context,
	workspaceSlug string,
) (*PortalResponse, *irminmodels.IrminAPIResponse, error) {
	var portal PortalResponse
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodPost,
		Endpoint: fmt.Sprintf("/v1/workspaces/%s/billing/portal", workspaceSlug),
	}, &portal)
	if err != nil {
		return nil, nil, fmt.Errorf("get portal URL error: %w", err)
	}
	return &portal, apiResp, nil
}
