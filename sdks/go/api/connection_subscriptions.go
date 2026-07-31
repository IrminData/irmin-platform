package irmincore

import (
	"context"
	"fmt"
	"net/http"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// CreateConnectionSubscriptionRequest represents the JSON request body for creating connection subscriptions.
type CreateConnectionSubscriptionRequest struct {
	Name        string   `json:"name"                   validate:"required,max=255"                             example:"CRM Lead Changes"`
	Description string   `json:"description,omitempty"  validate:"max=1000"                                     example:"Subscribe to lead changes in the CRM"`
	FilterPaths []string `json:"filter_paths,omitempty" validate:"dive,max=500"                                 example:"leads,contacts"`
	EventTypes  []string `json:"event_types,omitempty"  validate:"dive,oneof=insert update delete upsert batch" example:"insert,update"`
}

// UpdateConnectionSubscriptionRequest represents the JSON request body for updating connection subscriptions.
type UpdateConnectionSubscriptionRequest struct {
	Name        *string   `json:"name,omitempty"         validate:"omitnil,max=255"                                      example:"CRM Lead Changes"`
	Description *string   `json:"description,omitempty"  validate:"omitnil,max=1000"                                     example:"Subscribe to lead changes in the CRM"`
	FilterPaths *[]string `json:"filter_paths,omitempty" validate:"omitnil,dive,max=500"                                 example:"leads,contacts"`
	EventTypes  *[]string `json:"event_types,omitempty"  validate:"omitnil,dive,oneof=insert update delete upsert batch" example:"insert,update"`
	IsActive    *bool     `json:"is_active,omitempty"                                                                    example:"true"`
}

// ListConnectionSubscriptions retrieves all subscriptions for a connection.
func (c *Client) ListConnectionSubscriptions(
	ctx context.Context,
	workspace, connectionID string,
) ([]irminmodels.ConnectionSubscription, *irminmodels.IrminAPIResponse, error) {
	var subscriptions []irminmodels.ConnectionSubscription
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/connections/%s/subscriptions",
			workspace,
			connectionID,
		),
	}, &subscriptions)
	if err != nil {
		return nil, nil, fmt.Errorf("list connection subscriptions error: %w", err)
	}
	return subscriptions, apiResp, nil
}

// CreateConnectionSubscription creates a new subscription for a connection.
func (c *Client) CreateConnectionSubscription(
	ctx context.Context,
	workspace, connectionID string,
	req CreateConnectionSubscriptionRequest,
) (*irminmodels.ConnectionSubscriptionWithToken, *irminmodels.IrminAPIResponse, error) {
	var subscription irminmodels.ConnectionSubscriptionWithToken
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodPost,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/connections/%s/subscriptions",
			workspace,
			connectionID,
		),
		ContentType: "application/json",
		Body:        req,
	}, &subscription)
	if err != nil {
		return nil, nil, fmt.Errorf("create connection subscription error: %w", err)
	}
	return &subscription, apiResp, nil
}

// GetConnectionSubscription retrieves a specific subscription by ID.
func (c *Client) GetConnectionSubscription(
	ctx context.Context,
	workspace, connectionID, subscriptionID string,
) (*irminmodels.ConnectionSubscription, *irminmodels.IrminAPIResponse, error) {
	var subscription irminmodels.ConnectionSubscription
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodGet,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/connections/%s/subscriptions/%s",
			workspace,
			connectionID,
			subscriptionID,
		),
	}, &subscription)
	if err != nil {
		return nil, nil, fmt.Errorf("get connection subscription error: %w", err)
	}
	return &subscription, apiResp, nil
}

// UpdateConnectionSubscription updates an existing subscription.
func (c *Client) UpdateConnectionSubscription(
	ctx context.Context,
	workspace, connectionID, subscriptionID string,
	req UpdateConnectionSubscriptionRequest,
) (*irminmodels.ConnectionSubscription, *irminmodels.IrminAPIResponse, error) {
	var subscription irminmodels.ConnectionSubscription
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodPatch,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/connections/%s/subscriptions/%s",
			workspace,
			connectionID,
			subscriptionID,
		),
		ContentType: "application/json",
		Body:        req,
	}, &subscription)
	if err != nil {
		return nil, nil, fmt.Errorf("update connection subscription error: %w", err)
	}
	return &subscription, apiResp, nil
}

// DeleteConnectionSubscription deletes a subscription by ID.
func (c *Client) DeleteConnectionSubscription(
	ctx context.Context,
	workspace, connectionID, subscriptionID string,
) (*irminmodels.IrminAPIResponse, error) {
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodDelete,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/connections/%s/subscriptions/%s",
			workspace,
			connectionID,
			subscriptionID,
		),
	}, nil)
	if err != nil {
		return nil, fmt.Errorf("delete connection subscription error: %w", err)
	}
	return apiResp, nil
}

// RegenerateConnectionSubscriptionToken regenerates the webhook token for a subscription.
// The new token is returned in the response.
func (c *Client) RegenerateConnectionSubscriptionToken(
	ctx context.Context,
	workspace, connectionID, subscriptionID string,
) (*irminmodels.ConnectionSubscriptionWithToken, *irminmodels.IrminAPIResponse, error) {
	var subscription irminmodels.ConnectionSubscriptionWithToken
	apiResp, err := c.FetchAPI(ctx, RequestOptions{
		Method: http.MethodPost,
		Endpoint: fmt.Sprintf(
			"/v1/workspaces/%s/connections/%s/subscriptions/%s/regenerate-token",
			workspace,
			connectionID,
			subscriptionID,
		),
	}, &subscription)
	if err != nil {
		return nil, nil, fmt.Errorf("regenerate connection subscription token error: %w", err)
	}
	return &subscription, apiResp, nil
}
