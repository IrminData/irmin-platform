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
// Phase 4: details/settings ride on the request body so the connector
// service can upsert its Operation row inline before invoking the
// connector-specific subscribe handler. Authenticated via the
// connector's system token on the Client.
func (c *Client) SubscribeToChanges(
	ctx context.Context,
	webhookURL, webhookAccessToken string,
	details, settings map[string]string,
) (*Subscription, error) {
	formFields := buildDetailsSettingsForm(details, settings)
	formFields["webhook_url"] = webhookURL
	formFields["webhook_access_token"] = webhookAccessToken

	var subscription Subscription
	if err := c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/operation/subscribe",
		FormFields:  formFields,
		ContentType: contentTypeFormURLEncoded,
	}, &subscription); err != nil {
		return nil, err
	}
	return &subscription, nil
}

// UnsubscribeFromChanges removes a previously-registered webhook so
// the connector stops sending change notifications. Same Phase-4
// credential channel as SubscribeToChanges.
func (c *Client) UnsubscribeFromChanges(
	ctx context.Context,
	subscriptionID uint,
	details, settings map[string]string,
) error {
	formFields := buildDetailsSettingsForm(details, settings)
	formFields["subscription_id"] = strconv.FormatUint(uint64(subscriptionID), 10)

	return c.FetchAPI(ctx, RequestOptions{
		Method:      http.MethodPost,
		Endpoint:    "/operation/unsubscribe",
		FormFields:  formFields,
		ContentType: contentTypeFormURLEncoded,
	}, nil)
}
