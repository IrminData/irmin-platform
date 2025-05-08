package irminconnectorclient

import (
	"net/http"
)

type Subscription struct {
	ID                      int     `json:"ID"`
	CreatedAt               string  `json:"CreatedAt"`
	UpdatedAt               string  `json:"UpdatedAt"`
	DeletedAt               *string `json:"DeletedAt,omitempty"`
	WebhookURL              string  `json:"webhookUrl"`
	WebhookAccessToken      string  `json:"webhookAccessToken"`
	ConnectorRegistrationID int     `json:"connectorRegistrationID"`
	OperationID             int     `json:"operationID"`
}

// SubscribeToChanges subscribes to changes in the data and sends the changes to the specified webhook.
//
// Note: Operation token is required for this operation.
//
// Parameters:
// - webhook: The URL of the webhook to send the changes to.
// - webhookAccessToken: The token to authenticate the webhook request with.
//
// Returns:
// - The schema for the specified operation method if the request is successful.
// - An error if the request fails.
func (c *Client) SubscribeToChanges(webhook, webhookAccessToken string) (*Subscription, error) {
	var subscription Subscription
	if err := c.FetchAPI(RequestOptions{
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
