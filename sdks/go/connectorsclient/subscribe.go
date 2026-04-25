package connectorsclient

import (
	"context"
	"net/http"
	"strconv"
)

// Subscription records the server-side registration of a webhook the
// connector will hit on data changes.
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

// SubscribeToChanges registers webhookURL to receive change events.
// Subscribe is a fast, idempotent webhook-registration call; it stays
// on the sync route and is not driven through the async job protocol.
//
// Requires an operation token on the Client.
func (c *Client) SubscribeToChanges(ctx context.Context, webhookURL, webhookAccessToken string) (*Subscription, error) {
	var subscription Subscription
	if err := c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodPost,
		Endpoint: "/operation/subscribe",
		FormFields: map[string]string{
			"webhook_url":          webhookURL,
			"webhook_access_token": webhookAccessToken,
		},
		ContentType: "application/x-www-form-urlencoded",
	}, &subscription); err != nil {
		return nil, err
	}
	return &subscription, nil
}

// UnsubscribeFromChanges removes a previously-registered webhook so
// the connector stops sending change notifications.
//
// Requires an operation token on the Client.
func (c *Client) UnsubscribeFromChanges(ctx context.Context, subscriptionID uint) error {
	return c.FetchAPI(ctx, RequestOptions{
		Method:   http.MethodPost,
		Endpoint: "/operation/unsubscribe",
		FormFields: map[string]string{
			"subscription_id": strconv.FormatUint(uint64(subscriptionID), 10),
		},
		ContentType: "application/x-www-form-urlencoded",
	}, nil)
}
