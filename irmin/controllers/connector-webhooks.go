package controllers

import (
	"encoding/json"
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/orchestrator"
	"irmin-api/services"
	"irmin-api/utils"
	"strings"
	"time"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"github.com/gofiber/fiber/v3"
)

// ConnectorWebhookPayload represents the expected payload from connector webhooks.
// This is the data structure that connectors send when data changes occur.
type ConnectorWebhookPayload struct {
	// EventType is the type of change (insert, update, delete, upsert, batch)
	EventType string `json:"event_type"              validate:"required,oneof=insert update delete upsert batch"`
	// Path is the logical path of the affected data (e.g., "users", "orders/2024")
	Path string `json:"path"                    validate:"required"`
	// Timestamp is when the event occurred in the external system (Unix milliseconds)
	Timestamp int64 `json:"timestamp,omitempty"`
	// AffectedRows is the number of rows affected by this event
	AffectedRows int `json:"affected_rows,omitempty"`
	// Patches contains pre-computed patch operations from the connector
	Patches []irminmodels.PatchOperation `json:"patches,omitempty"`
	// Payload contains any additional raw event data from the connector
	Payload json.RawMessage `json:"payload,omitempty"`
}

// ConnectorWebhook godoc
// @Summary Receive connector webhook events
// @Description Handle webhook events from external connectors when data changes occur
// @Tags webhooks
// @Accept json
// @Produce json
// @Param connection path string true "Connection ID (SQID)"
// @Param X-Webhook-Token header string true "Webhook authentication token"
// @Param body body ConnectorWebhookPayload true "Webhook event payload"
// @Success 200 {object} irminmodels.IrminAPIResponse "Webhook processed successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid payload"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing webhook token"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Connection not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /webhooks/connectors/{connection} [post]
func (api *APIControllers) ConnectorWebhook(c fiber.Ctx) error {
	// Get the dictionary for translations
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	if !dictOk {
		dict = locales.Dictionary{} // Use empty dict as fallback
	}

	// Get the connection from middleware (set by ConnectorWebhookMiddleware)
	connection, connectionOk := c.Locals("connection").(*db.Connection)
	if !connectionOk || connection == nil {
		return api.handleServiceError(
			c,
			"Connection not found in context",
			services.ErrNotFound,
			dict,
		)
	}

	// Get the subscription from middleware (set by ConnectorWebhookMiddleware)
	subscription, subscriptionOk := c.Locals("subscription").(*db.ConnectionSubscription)
	if !subscriptionOk || subscription == nil {
		return api.handleServiceError(
			c,
			"Subscription not found in context",
			services.ErrNotFound,
			dict,
		)
	}

	// Parse the webhook payload
	var payload ConnectorWebhookPayload
	if err := c.Bind().JSON(&payload); err != nil {
		api.Logger.Error("Error parsing connector webhook payload",
			"error", err,
			"connection_id", connection.ID,
		)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Message: "Invalid webhook payload",
			Errors:  []string{err.Error()},
		})
	}

	// Validate the payload
	if validationErr := api.validator.ValidateEnhanced(&payload); validationErr.HasErrors() {
		api.Logger.Error("Connector webhook payload validation failed",
			"errors", validationErr.GetFieldErrors(),
			"connection_id", connection.ID,
		)
		errors := make([]string, 0)
		for field, errMsg := range validationErr.GetFieldErrors() {
			errors = append(errors, field+": "+errMsg)
		}
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Message: "Invalid webhook payload",
			Errors:  errors,
		})
	}

	// Convert event type string to db.ConnectionEventType
	eventType := db.ConnectionEventType(payload.EventType)

	// Check if the event matches the subscription's filters
	// If EventTypes filter is set and doesn't match, skip this event
	if len(subscription.EventTypes) > 0 && !eventTypeMatchesFilter(payload.EventType, subscription.EventTypes) {
		api.Logger.Info("Event type filtered by subscription",
			"connection_id", connection.ID,
			"subscription_id", subscription.ID,
			"event_type", payload.EventType,
			"allowed_types", subscription.EventTypes,
		)
		return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
			Message: "Event filtered by subscription settings",
		})
	}

	// If FilterPaths filter is set and doesn't match, skip this event
	if len(subscription.FilterPaths) > 0 && !pathMatchesFilter(payload.Path, subscription.FilterPaths) {
		api.Logger.Info("Path filtered by subscription",
			"connection_id", connection.ID,
			"subscription_id", subscription.ID,
			"event_path", payload.Path,
			"allowed_paths", subscription.FilterPaths,
		)
		return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
			Message: "Event filtered by subscription settings",
		})
	}

	// Determine event time
	eventTime := time.Now()
	if payload.Timestamp > 0 {
		eventTime = time.UnixMilli(payload.Timestamp)
	}

	// Create the connection event for the orchestrator
	event := &orchestrator.ConnectionEvent{
		EventType:    eventType,
		EventTime:    eventTime,
		ConnectionID: connection.ID,
		ConnectorID:  connection.ConnectorID,
		Path:         payload.Path,
		AffectedRows: payload.AffectedRows,
		Patches:      payload.Patches,
		Payload:      payload.Payload,
	}

	// Log the incoming webhook
	api.Logger.Info("Received connector webhook",
		"connection_id", connection.ID,
		"connection_name", connection.Name,
		"connector_id", connection.ConnectorID,
		"event_type", eventType,
		"path", payload.Path,
		"affected_rows", payload.AffectedRows,
		"patch_count", len(payload.Patches),
	)

	// Send the event to the orchestrator for processing
	api.Orchestrator.AddConnectionEvent(event)

	// Return success response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: "Webhook received successfully",
	})
}

// eventTypeMatchesFilter checks if an event type matches any of the allowed event types.
func eventTypeMatchesFilter(eventType string, allowedTypes []string) bool {
	for _, allowed := range allowedTypes {
		if strings.EqualFold(eventType, allowed) {
			return true
		}
	}
	return false
}

// pathMatchesFilter checks if an event path matches any of the filter patterns.
// It supports simple prefix matching - if the event path starts with or equals
// any of the filter paths, it's considered a match.
func pathMatchesFilter(eventPath string, filters []string) bool {
	for _, filter := range filters {
		// Normalize paths by removing leading/trailing slashes
		normalizedEvent := strings.Trim(eventPath, "/")
		normalizedFilter := strings.Trim(filter, "/")

		// Check for exact match or prefix match
		if normalizedEvent == normalizedFilter {
			return true
		}
		if strings.HasPrefix(normalizedEvent, normalizedFilter+"/") {
			return true
		}
	}
	return false
}
