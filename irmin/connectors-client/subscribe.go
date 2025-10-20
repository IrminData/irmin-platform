package connectorsclient

import (
	"context"
	"net/http"
)

// Subscription represents a record of an active subscription to changes in data.
type Subscription struct {
	ID                      uint    `json:"ID"                      example:"1"`
	CreatedAt               string  `json:"CreatedAt"               example:"2021-01-01T00:00:00Z"`
	UpdatedAt               string  `json:"UpdatedAt"               example:"2021-01-01T00:00:00Z"`
	DeletedAt               *string `json:"DeletedAt,omitempty"     example:"2021-01-01T00:00:00Z"`
	WebhookURL              string  `json:"webhookUrl"              example:"https://example.com/webhook"`
	WebhookAccessToken      string  `json:"webhookAccessToken"      example:"1234567890"`
	ConnectorRegistrationID uint    `json:"connectorRegistrationID" example:"1"`
	OperationID             uint    `json:"operationID"             example:"1"`
}

// SubscribeToChanges subscribes to changes in the data and sends the changes to the specified webhook.
//
// Note: Operation token is required for this operation.
//
// Parameters:
// - ctx: Context for request cancellation and timeout control.
// - webhook: The URL of the webhook to send the changes to.
// - webhookAccessToken: The token to authenticate the webhook request with.
//
// Returns:
// - The schema for the specified operation method if the request is successful.
// - An error if the request fails.
func (c *Client) SubscribeToChanges(ctx context.Context, webhook, webhookAccessToken string) (*Subscription, error) {
	var subscription Subscription
	if err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodPost,
		Endpoint: "/operation/subscribe",
		FormFields: map[string]string{
			"webhook":              webhook,
			"webhook_access_token": webhookAccessToken,
		},
	}, &subscription); err != nil {
		return nil, err
	}
	return &subscription, nil
}
