package irminConnectorClient

import (
	"net/http"
)

type Subscription struct {
	ID                      int     `json:"ID"`
	CreatedAt               string  `json:"CreatedAt"`
	UpdatedAt               string  `json:"UpdatedAt"`
	DeletedAt               *string `json:"DeletedAt,omitempty"`
	WebhookUrl              string  `json:"webhookUrl"`
	WebhookAccessToken      string  `json:"webhookAccessToken"`
	ConnectorRegistrationID int     `json:"connectorRegistrationID"`
	OperationID             int     `json:"operationID"`
}

// SubscribeToChanges subscribes to changes in the data and sends the changes to the specified webhook.
//
// Note: Operation token is required for this operation.
//
// Parameters:
// - webhook_url: The URL of the webhook to send the changes to.
// - webhook_access_token: The token to authenticate the webhook request with.
//
// Returns:
// - The schema for the specified operation method if the request is successful.
// - An error if the request fails.
func (c *Client) SubscribeToChanges(webhook, webhook_access_token string) (*Subscription, error) {
	var subscription Subscription
	if err := c.FetchAPI(RequestOptions{
		Method:   http.MethodPost,
		Endpoint: "/operation/subscribe",
		FormFields: map[string]string{
			"webhook":              webhook,
			"webhook_access_token": webhook_access_token,
		},
	}, &subscription); err != nil {
		return nil, err
	}
	return &subscription, nil
}
