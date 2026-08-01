package tests

import (
	"context"

	"irmin-connectors/e2e-tests/helpers"
)

// TestSubscribe tests the subscription capability of a connector.
func TestSubscribe(ctx context.Context, client *helpers.ConnectorClient, webhookURL, webhookToken string) error {
	// Use default webhook URL if not provided
	if webhookURL == "" {
		webhookURL = "https://example.com/webhook"
	}

	if webhookToken == "" {
		webhookToken = "test-webhook-token"
	}

	subscription, err := client.SubscribeToChanges(ctx, webhookURL, webhookToken)
	if err != nil {
		return err
	}

	if subscription == nil {
		return &helpers.TestError{Message: "Expected non-nil subscription"}
	}

	if subscription.ID == 0 {
		return &helpers.TestError{Message: "Expected subscription ID to be non-zero"}
	}

	if webhookErr := helpers.AssertNotEmpty(subscription.WebhookURL, "webhook URL"); webhookErr != nil {
		return webhookErr
	}

	return nil
}
