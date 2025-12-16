package services

import (
	"context"
	"encoding/json"
	"irmin-api/lakefs"
	"irmin-api/orchestrator"
)

func (api *APIServices) ProcessSystemWebhook(
	c context.Context,
	webhookType string,
	payload []byte,
	isSystem bool,
) error {
	// Only allow system users to call this function
	if !isSystem {
		api.Logger.ErrorContext(c, "Only system users are allowed to call this function")
		return ErrSystemUserRequired
	}

	// Switch based on the type
	switch webhookType {
	case "lakefs":
		// Handle the lakefs webhook events
		var webhookEvent lakefs.WebhookEvent
		if unmarshalErr := json.Unmarshal(payload, &webhookEvent); unmarshalErr != nil {
			api.Logger.ErrorContext(c, "Error unmarshalling LakeFS webhook event", "error", unmarshalErr)
			return NewInternalErrorf("error unmarshalling LakeFS webhook event: %w", unmarshalErr)
		}

		// Add the event to the orchestrator
		api.Orchestrator.AddLakefsEvent(&webhookEvent)

	case "dispatch":
		// Handle the dispatch events from the orchestrator
		var dispatchEvent orchestrator.DispatchEvent
		if unmarshalErr := json.Unmarshal(payload, &dispatchEvent); unmarshalErr != nil {
			api.Logger.ErrorContext(c, "Error unmarshalling dispatch event", "error", unmarshalErr)
			return NewInternalErrorf("error unmarshalling dispatch event: %w", unmarshalErr)
		}

		// Add the event to the orchestrator
		api.Orchestrator.AddDispatchedEvent(&dispatchEvent)

	default:
		api.Logger.ErrorContext(c, "Invalid webhook type", "type", webhookType)
		return ErrInvalidWebhookType
	}

	return nil
}
