package formatter

import (
	"errors"
	"fmt"
	"irmin-api/db"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminsqids "github.com/IrminData/irmin-sdk-go/sqids"
)

// FormatConnectionSubscriptionResponse creates a subscription response object from a database subscription object.
func FormatConnectionSubscriptionResponse(
	subscription *db.ConnectionSubscription,
	sqidManager *irminsqids.SQIDManager,
	apiBaseURL string,
) (*irminmodels.ConnectionSubscription, error) {
	if subscription == nil {
		return nil, errors.New("subscription is nil")
	}

	// Construct the subscription sqid
	subscriptionSqid, err := sqidManager.Encode("connection_subscriptions", uint64(subscription.ID))
	if err != nil {
		return nil, fmt.Errorf("error encoding subscription sqid: %w", err)
	}

	// Construct the connection sqid
	connectionSqid, err := sqidManager.Encode("connections", uint64(subscription.ConnectionID))
	if err != nil {
		return nil, fmt.Errorf("error encoding connection sqid: %w", err)
	}

	webhookURL := fmt.Sprintf("%s/api/v1/webhooks/connectors/%s", apiBaseURL, connectionSqid)

	// Format owner if present
	var owner *irminmodels.User
	if subscription.Owner != nil {
		formattedOwner, ownerErr := FormatUserResponse(subscription.Owner, sqidManager)
		if ownerErr == nil {
			owner = formattedOwner
		}
	}

	// Ensure filter paths and event types are never nil
	filterPaths := subscription.FilterPaths
	if filterPaths == nil {
		filterPaths = []string{}
	}
	eventTypes := subscription.EventTypes
	if eventTypes == nil {
		eventTypes = []string{}
	}

	// Construct the subscription response
	response := irminmodels.ConnectionSubscription{
		ID:           subscriptionSqid,
		Name:         subscription.Name,
		Description:  subscription.Description,
		ConnectionID: connectionSqid,
		FilterPaths:  filterPaths,
		EventTypes:   eventTypes,
		IsActive:     subscription.IsActive,
		WebhookURL:   webhookURL,
		Owner:        owner,
		CreatedAt:    subscription.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:    subscription.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}

	return &response, nil
}

// FormatConnectionSubscriptionWithTokenResponse creates a subscription response with the webhook token.
// This should only be used when returning a newly created subscription.
func FormatConnectionSubscriptionWithTokenResponse(
	subscription *db.ConnectionSubscription,
	sqidManager *irminsqids.SQIDManager,
	apiBaseURL string,
) (*irminmodels.ConnectionSubscriptionWithToken, error) {
	base, err := FormatConnectionSubscriptionResponse(subscription, sqidManager, apiBaseURL)
	if err != nil {
		return nil, err
	}

	response := irminmodels.ConnectionSubscriptionWithToken{
		ConnectionSubscription: *base,
		WebhookToken:           subscription.WebhookToken,
	}

	return &response, nil
}
