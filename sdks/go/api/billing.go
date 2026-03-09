package irmincore

import (
	"context"
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// CheckoutRequest represents the JSON request body for creating a checkout session or changing a plan.
type CheckoutRequest struct {
	PlanTier        irminmodels.PlanTier        `json:"plan_tier"         validate:"required" example:"pro"`
	BillingInterval irminmodels.BillingInterval  `json:"billing_interval" validate:"required" example:"monthly"`
	ReturnURL       string                       `json:"return_url"       validate:"required" example:"https://app.irmin.io/workspace/my-workspace/settings/billing/success"`
}

// CheckoutResponse represents the response body for checkout and change-plan endpoints.
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

// ChangePlan changes the billing plan for a workspace.
func (c *Client) ChangePlan(
	ctx context.Context,
	workspaceSlug string,
	req CheckoutRequest,
) (*CheckoutResponse, *irminmodels.IrminAPIResponse, error) {
	var checkout CheckoutResponse
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    fmt.Sprintf("/v1/workspaces/%s/billing/change-plan", workspaceSlug),
		ContentType: "application/json",
		Body:        req,
	}, &checkout)
	if err != nil {
		return nil, nil, fmt.Errorf("change plan error: %w", err)
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
