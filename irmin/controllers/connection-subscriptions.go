package controllers

import (
	"context"
	"errors"

	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/services"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// ConnectionSubscriptionsIndex godoc
// @Summary List subscriptions for a connection
// @Description Get all subscriptions for the specified connection
// @Tags connection-subscriptions
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param connection path string true "Connection ID"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.ConnectionSubscription} "Subscriptions retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Connection not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/connections/{connection}/subscriptions [get]
func (api *APIControllers) ConnectionSubscriptionsIndex(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	connection, connectionOk := c.Locals("connection").(*db.Connection)
	if !dictOk || !connectionOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ConnectionSubscriptionsIndex",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Get subscriptions for the connection
	subscriptions, err := api.DB.GetConnectionSubscriptionsByConnectionID(connection.ID)
	if err != nil {
		return api.handleServiceError(c, "Failed to list subscriptions", err, dict)
	}

	// Format the response
	subscriptionsResponse, formatErr := formatter.FormatIndexResponse(
		subscriptions,
		formatter.FormatConnectionSubscriptionResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format subscriptions",
			services.NewInternalErrorf("error formatting subscriptions: %v", formatErr),
			dict,
		)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: subscriptionsResponse,
	})
}

// ConnectionSubscriptionsStore godoc
// @Summary Create a new subscription
// @Description Create a new subscription for the specified connection. Returns the webhook URL and token.
// @Tags connection-subscriptions
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param connection path string true "Connection ID"
// @Param request body irmincore.CreateConnectionSubscriptionRequest true "Subscription creation parameters"
// @Success 201 {object} irminmodels.IrminAPIResponse{data=irminmodels.ConnectionSubscriptionWithToken} "Subscription created successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Connection not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/connections/{connection}/subscriptions [post]
func (api *APIControllers) ConnectionSubscriptionsStore(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	connection, connectionOk := c.Locals("connection").(*db.Connection)
	if !dictOk || !userOk || !connectionOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ConnectionSubscriptionsStore",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse and validate the request body
	var req irmincore.CreateConnectionSubscriptionRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Create the subscription
	subscription := &db.ConnectionSubscription{
		Name:         req.Name,
		Description:  req.Description,
		ConnectionID: connection.ID,
		WorkspaceID:  connection.WorkspaceID,
		FilterPaths:  req.FilterPaths,
		EventTypes:   req.EventTypes,
		IsActive:     true,
		OwnerID:      &user.ID,
	}

	if err := api.DB.CreateConnectionSubscription(subscription); err != nil {
		return api.handleServiceError(c, "Failed to create subscription", err, dict)
	}

	// Get connection SQID for the webhook URL
	connectionSqid, sqidErr := api.SQIDManager.Encode("connections", uint64(connection.ID))
	if sqidErr != nil {
		api.Logger.ErrorContext(c.Context(), "Failed to encode connection SQID", "error", sqidErr)
	}

	// Register subscription with connector (if it supports patch_event capability)
	if connectionSqid != "" {
		subscriptionService := services.NewConnectionSubscriptionService(api.DB, api.Env.URL)
		connectorSubID, registerErr := subscriptionService.RegisterSubscriptionWithConnector(
			context.Background(),
			connection,
			subscription,
			connectionSqid,
		)
		if registerErr != nil && !errors.Is(registerErr, services.ErrConnectorCapabilityNotSupported) {
			// Log the error but don't fail the request - manual webhook still works
			// Note: ErrConnectorCapabilityNotSupported is expected for connectors without patch_event
			api.Logger.ErrorContext(c.Context(), "Failed to register subscription with connector",
				"error", registerErr,
				"subscription_id", subscription.ID,
				"connection_id", connection.ID)
		} else if connectorSubID != nil {
			// Update subscription with connector subscription ID
			subscription.ConnectorSubscriptionID = connectorSubID
			if updateErr := api.DB.UpdateConnectionSubscription(subscription); updateErr != nil {
				// Clean up the connector subscription since we couldn't persist the ID
				// This prevents orphaned subscriptions in the connector system
				_ = subscriptionService.UnregisterSubscriptionFromConnector(
					context.Background(),
					connection,
					*connectorSubID,
				)
				// Clear the in-memory ID since it wasn't persisted - prevents returning
				// a ConnectorSubscriptionID to the client that doesn't exist in the database
				subscription.ConnectorSubscriptionID = nil
				api.Logger.ErrorContext(c.Context(), "Failed to update subscription with connector ID, cleaned up connector subscription",
					"error", updateErr,
					"subscription_id", subscription.ID,
					"connector_subscription_id", *connectorSubID)
			}
		}
	}

	// Reload the subscription to get the owner
	subscription.Owner = user

	// Format the response with the webhook token (only shown on creation)
	subscriptionResponse, formatErr := formatter.FormatConnectionSubscriptionWithTokenResponse(
		subscription,
		api.SQIDManager,
	)
	if formatErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format subscription response",
			services.NewInternalErrorf("error formatting subscription response: %v", formatErr),
			dict,
		)
	}

	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: "Subscription created successfully",
		Data:    subscriptionResponse,
	})
}

// ConnectionSubscriptionsShow godoc
// @Summary Get subscription details
// @Description Get details of a specific subscription
// @Tags connection-subscriptions
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param connection path string true "Connection ID"
// @Param subscription path string true "Subscription ID"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.ConnectionSubscription} "Subscription retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Subscription not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/connections/{connection}/subscriptions/{subscription} [get]
func (api *APIControllers) ConnectionSubscriptionsShow(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	connection, connectionOk := c.Locals("connection").(*db.Connection)
	subscription, subscriptionOk := c.Locals("subscription").(*db.ConnectionSubscription)
	if !dictOk || !connectionOk || !subscriptionOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ConnectionSubscriptionsShow",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Verify the subscription belongs to the connection in the URL
	if subscription.ConnectionID != connection.ID {
		return api.handleServiceError(
			c,
			"Subscription does not belong to this connection",
			services.ErrNotFound,
			dict,
		)
	}

	// Format the response
	subscriptionResponse, formatErr := formatter.FormatConnectionSubscriptionResponse(subscription, api.SQIDManager)
	if formatErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format subscription response",
			services.NewInternalErrorf("error formatting subscription response: %v", formatErr),
			dict,
		)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: subscriptionResponse,
	})
}

// ConnectionSubscriptionsUpdate godoc
// @Summary Update subscription
// @Description Update an existing subscription's details
// @Tags connection-subscriptions
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param connection path string true "Connection ID"
// @Param subscription path string true "Subscription ID"
// @Param request body irmincore.UpdateConnectionSubscriptionRequest true "Subscription update parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.ConnectionSubscription} "Subscription updated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Subscription not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/connections/{connection}/subscriptions/{subscription} [patch]
func (api *APIControllers) ConnectionSubscriptionsUpdate(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	connection, connectionOk := c.Locals("connection").(*db.Connection)
	subscription, subscriptionOk := c.Locals("subscription").(*db.ConnectionSubscription)
	if !dictOk || !connectionOk || !subscriptionOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ConnectionSubscriptionsUpdate",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Verify the subscription belongs to the connection in the URL
	if subscription.ConnectionID != connection.ID {
		return api.handleServiceError(
			c,
			"Subscription does not belong to this connection",
			services.ErrNotFound,
			dict,
		)
	}

	// Parse and validate the request body
	var req irmincore.UpdateConnectionSubscriptionRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Update fields if provided
	if req.Name != nil {
		subscription.Name = *req.Name
	}
	if req.Description != nil {
		subscription.Description = *req.Description
	}
	if req.FilterPaths != nil {
		subscription.FilterPaths = *req.FilterPaths
	}
	if req.EventTypes != nil {
		subscription.EventTypes = *req.EventTypes
	}
	if req.IsActive != nil {
		subscription.IsActive = *req.IsActive
	}

	// Save the updated subscription
	if err := api.DB.UpdateConnectionSubscription(subscription); err != nil {
		return api.handleServiceError(c, "Failed to update subscription", err, dict)
	}

	// Format the response
	subscriptionResponse, formatErr := formatter.FormatConnectionSubscriptionResponse(subscription, api.SQIDManager)
	if formatErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format subscription response",
			services.NewInternalErrorf("error formatting subscription response: %v", formatErr),
			dict,
		)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: "Subscription updated successfully",
		Data:    subscriptionResponse,
	})
}

// ConnectionSubscriptionsDestroy godoc
// @Summary Delete subscription
// @Description Delete a subscription
// @Tags connection-subscriptions
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param connection path string true "Connection ID"
// @Param subscription path string true "Subscription ID"
// @Success 200 {object} irminmodels.IrminAPIResponse "Subscription deleted successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Subscription not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/connections/{connection}/subscriptions/{subscription} [delete]
func (api *APIControllers) ConnectionSubscriptionsDestroy(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	connection, connectionOk := c.Locals("connection").(*db.Connection)
	subscription, subscriptionOk := c.Locals("subscription").(*db.ConnectionSubscription)
	if !dictOk || !connectionOk || !subscriptionOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ConnectionSubscriptionsDestroy",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Verify the subscription belongs to the connection in the URL
	if subscription.ConnectionID != connection.ID {
		return api.handleServiceError(
			c,
			"Subscription does not belong to this connection",
			services.ErrNotFound,
			dict,
		)
	}

	// Unsubscribe from connector if there's a connector subscription ID
	if subscription.ConnectorSubscriptionID != nil {
		subscriptionService := services.NewConnectionSubscriptionService(api.DB, api.Env.URL)
		if unsubErr := subscriptionService.UnregisterSubscriptionFromConnector(
			context.Background(),
			connection,
			*subscription.ConnectorSubscriptionID,
		); unsubErr != nil {
			// Log the error but don't fail the request - we still want to delete the local subscription
			api.Logger.ErrorContext(c.Context(), "Failed to unsubscribe from connector",
				"error", unsubErr,
				"subscription_id", subscription.ID,
				"connector_subscription_id", *subscription.ConnectorSubscriptionID)
		}
	}

	// Delete the subscription
	if err := api.DB.DeleteConnectionSubscription(subscription.ID); err != nil {
		return api.handleServiceError(c, "Failed to delete subscription", err, dict)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: "Subscription deleted successfully",
	})
}

// ConnectionSubscriptionsRegenerateToken godoc
// @Summary Regenerate webhook token
// @Description Regenerate the webhook token for a subscription. The old token will no longer work.
// @Tags connection-subscriptions
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param connection path string true "Connection ID"
// @Param subscription path string true "Subscription ID"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.ConnectionSubscriptionWithToken} "Token regenerated successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Subscription not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/connections/{connection}/subscriptions/{subscription}/regenerate-token [post]
func (api *APIControllers) ConnectionSubscriptionsRegenerateToken(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	connection, connectionOk := c.Locals("connection").(*db.Connection)
	subscription, subscriptionOk := c.Locals("subscription").(*db.ConnectionSubscription)
	if !dictOk || !connectionOk || !subscriptionOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ConnectionSubscriptionsRegenerateToken",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Verify the subscription belongs to the connection in the URL
	if subscription.ConnectionID != connection.ID {
		return api.handleServiceError(
			c,
			"Subscription does not belong to this connection",
			services.ErrNotFound,
			dict,
		)
	}

	// Generate a new token
	newToken, err := db.GenerateWebhookToken()
	if err != nil {
		return api.handleServiceError(c, "Failed to generate new token", err, dict)
	}

	// If there's an active connector subscription, we need to re-register with the new token
	// The connector was registered with the old token, so we must unregister and re-register
	if subscription.ConnectorSubscriptionID != nil {
		subscriptionService := services.NewConnectionSubscriptionService(api.DB, api.Env.URL)

		// Unregister the old subscription from the connector
		if unsubErr := subscriptionService.UnregisterSubscriptionFromConnector(
			context.Background(),
			connection,
			*subscription.ConnectorSubscriptionID,
		); unsubErr != nil {
			api.Logger.ErrorContext(
				c.Context(),
				"Failed to unregister old connector subscription during token regeneration",
				"error",
				unsubErr,
				"subscription_id",
				subscription.ID,
				"connector_subscription_id",
				*subscription.ConnectorSubscriptionID,
			)
		}

		// Clear the old connector subscription ID
		subscription.ConnectorSubscriptionID = nil
	}

	// Update the subscription with the new token
	subscription.WebhookToken = newToken
	if updateErr := api.DB.UpdateConnectionSubscription(subscription); updateErr != nil {
		return api.handleServiceError(c, "Failed to update subscription", updateErr, dict)
	}

	// Re-register with connector using the new token (if supported)
	connectionSqid, sqidErr := api.SQIDManager.Encode("connections", uint64(connection.ID))
	if sqidErr != nil {
		api.Logger.ErrorContext(c.Context(), "Failed to encode connection SQID", "error", sqidErr)
	}

	if connectionSqid != "" {
		subscriptionService := services.NewConnectionSubscriptionService(api.DB, api.Env.URL)
		connectorSubID, registerErr := subscriptionService.RegisterSubscriptionWithConnector(
			context.Background(),
			connection,
			subscription,
			connectionSqid,
		)
		if registerErr != nil && !errors.Is(registerErr, services.ErrConnectorCapabilityNotSupported) {
			api.Logger.ErrorContext(
				c.Context(),
				"Failed to re-register subscription with connector after token regeneration",
				"error",
				registerErr,
				"subscription_id",
				subscription.ID,
				"connection_id",
				connection.ID,
			)
		} else if connectorSubID != nil {
			// Update subscription with new connector subscription ID
			subscription.ConnectorSubscriptionID = connectorSubID
			if updateErr := api.DB.UpdateConnectionSubscription(subscription); updateErr != nil {
				// Clean up the connector subscription since we couldn't persist the ID
				_ = subscriptionService.UnregisterSubscriptionFromConnector(
					context.Background(),
					connection,
					*connectorSubID,
				)
				subscription.ConnectorSubscriptionID = nil
				api.Logger.ErrorContext(c.Context(), "Failed to update subscription with new connector ID",
					"error", updateErr,
					"subscription_id", subscription.ID)
			}
		}
	}

	// Format the response with the new token
	subscriptionResponse, formatErr := formatter.FormatConnectionSubscriptionWithTokenResponse(
		subscription,
		api.SQIDManager,
	)
	if formatErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format subscription response",
			services.NewInternalErrorf("error formatting subscription response: %v", formatErr),
			dict,
		)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: "Webhook token regenerated successfully",
		Data:    subscriptionResponse,
	})
}
