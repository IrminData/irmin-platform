package mysqlconnector

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	mysqlclient "irmin-connectors/connectors/mysql/client"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"log/slog"
	"net/http"
	"strings"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// StartListener starts the MySQL change listener for a subscription.
func StartListener(
	ctx context.Context,
	logger *slog.Logger,
	subscription db.Subscription,
	database *db.Database,
) error {
	logger.InfoContext(ctx, "Starting MySQL change listener",
		"subscription_id", subscription.ID,
		"operation_id", subscription.OperationID)

	// Get the operation details
	operation, err := database.GetOperationByID(subscription.OperationID)
	if err != nil {
		return fmt.Errorf("failed to get operation: %w", err)
	}

	// Initialize the MySQL client
	mysqlClient, dbName, err := mysqlclient.InitMySQLClient(ctx, logger, operation)
	if err != nil {
		return fmt.Errorf("failed to initialize MySQL client: %w", err)
	}
	defer mysqlClient.Close()

	logger.InfoContext(ctx, "MySQL listener initialized",
		"database", dbName,
		"subscription_id", subscription.ID)

	// Start the binlog listener (simplified implementation)
	err = mysqlClient.StartBinlogListener(ctx, logger, func(payload string) {
		handleMySQLNotification(ctx, logger, subscription, database, payload)
	})

	if err != nil {
		return fmt.Errorf("failed to start MySQL binlog listener: %w", err)
	}

	logger.InfoContext(ctx, "MySQL listener started successfully",
		"subscription_id", subscription.ID,
		"database", dbName)

	// Keep the listener running until context is cancelled
	<-ctx.Done()
	logger.InfoContext(ctx, "MySQL listener stopped",
		"subscription_id", subscription.ID)

	return nil
}

// handleMySQLNotification processes MySQL change notifications.
func handleMySQLNotification(
	ctx context.Context,
	logger *slog.Logger,
	subscription db.Subscription,
	database *db.Database,
	payload string,
) {
	logger.DebugContext(ctx, "Received MySQL notification",
		"subscription_id", subscription.ID,
		"payload", payload)

	// Parse the notification payload
	var notification map[string]any
	if err := json.Unmarshal([]byte(payload), &notification); err != nil {
		logger.ErrorContext(ctx, "Failed to parse notification payload",
			"error", err,
			"payload", payload)
		return
	}

	// Get webhook URL from subscription
	if subscription.WebhookURL == "" {
		logger.DebugContext(ctx, "No webhook URL configured for subscription",
			"subscription_id", subscription.ID)
		return
	}

	// Get the database name from operation settings
	operation, operationErr := database.GetOperationByID(subscription.OperationID)
	if operationErr != nil {
		logger.ErrorContext(ctx, "Failed to get operation for webhook",
			"error", operationErr,
			"subscription_id", subscription.ID)
		return
	}

	var settings map[string]string
	if settingsErr := json.Unmarshal(operation.Settings, &settings); settingsErr != nil {
		logger.ErrorContext(ctx, "Failed to unmarshal operation settings",
			"error", settingsErr,
			"subscription_id", subscription.ID)
		return
	}

	// Get the row identifier as a string
	idStr := fmt.Sprintf("%v", notification["id"])

	// Safely get table name
	tableName := getTableName(notification)
	if tableName == "" {
		logger.ErrorContext(ctx, "Missing table name in notification",
			"subscription_id", subscription.ID,
			"notification", notification)
		return
	}

	// Construct the path for the event
	path := utils.ConstructPath(settings["database"], tableName, idStr, "")

	// Create the payload for the webhook
	data := irminmodels.ConnectorEvent{
		Type:      irminmodels.ConnectorEventType(strings.ToLower(getEventType(notification))),
		Path:      path,
		Timestamp: time.Now().UnixMilli(),
	}

	dataBytes, marshallErr := json.Marshal(data)
	if marshallErr != nil {
		logger.ErrorContext(ctx, "Failed to marshal event data",
			"error", marshallErr,
			"subscription_id", subscription.ID)
		return
	}

	// Forward the event to the webhook specified in the subscription
	req, reqErr := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		subscription.WebhookURL,
		bytes.NewReader(dataBytes),
	)
	if reqErr != nil {
		logger.ErrorContext(ctx, "Failed to create webhook request",
			"error", reqErr,
			"subscription_id", subscription.ID)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", subscription.WebhookAccessToken)

	// Send the notification
	resp, respErr := http.DefaultClient.Do(req)
	if respErr != nil {
		logger.ErrorContext(ctx, "Failed to send webhook notification",
			"error", respErr,
			"subscription_id", subscription.ID,
			"webhook_url", subscription.WebhookURL)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		logger.ErrorContext(ctx, "Webhook request failed with status",
			"status", resp.StatusCode,
			"subscription_id", subscription.ID,
			"webhook_url", subscription.WebhookURL)
	}

	logger.DebugContext(ctx, "Successfully sent MySQL webhook notification",
		"subscription_id", subscription.ID,
		"webhook_url", subscription.WebhookURL)
}

// getEventType extracts the event type from MySQL notification data.
func getEventType(notification map[string]any) string {
	if eventType, ok := notification["event_type"].(string); ok {
		return eventType
	}
	// Default to "change" if not specified
	return "change"
}

// getTableName extracts the table name from MySQL notification data.
func getTableName(notification map[string]any) string {
	if tableName, ok := notification["table_name"].(string); ok {
		return tableName
	}
	// Return empty string if not specified
	return ""
}
