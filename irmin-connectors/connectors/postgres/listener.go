package postgresconnector

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	postgresclient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// validateOperationDetails checks if all required fields are present in the operation details.
func validateOperationDetails(details map[string]string) error {
	requiredFields := []string{"host", "port", "user", "password", "default_db"}
	for _, field := range requiredFields {
		if _, exists := details[field]; !exists {
			return fmt.Errorf("missing required field in operation details: %s", field)
		}
	}
	return nil
}

// validateOperationSettings checks if all required fields are present in the operation settings.
func validateOperationSettings(settings map[string]string) error {
	if _, exists := settings["database"]; !exists {
		return errors.New("missing required field in operation settings: database")
	}
	return nil
}

// handleNotification processes a single notification and sends it to the webhook.
func handleNotification(
	ctx context.Context,
	logger *slog.Logger,
	payload string,
	settings map[string]string,
	subscription db.Subscription,
) {
	// Parse the payload into a map
	var evt map[string]any
	if err := json.Unmarshal([]byte(payload), &evt); err != nil {
		logger.ErrorContext(ctx, "failed to unmarshal event",
			"error", err)
		return
	}

	// Get the row identifier as a string
	idStr := fmt.Sprintf("%v", evt["id"])

	// Safely get table name with type assertion
	tableName, ok := evt["table"].(string)
	if !ok {
		logger.ErrorContext(ctx, "invalid table name type in event",
			"table", evt["table"])
		return
	}

	// Construct the path for the event
	path := utils.ConstructPath(settings["database"], tableName, idStr, "")

	// Safely get operation with type assertion
	operationStr, ok := evt["operation"].(string)
	if !ok {
		logger.ErrorContext(ctx, "invalid operation type in event",
			"operation", evt["operation"])
		return
	}

	// Create the payload for the webhook
	data := irminmodels.ConnectorEvent{
		Type:      irminmodels.ConnectorEventType(strings.ToLower(operationStr)),
		Path:      path,
		Timestamp: time.Now().UnixMilli(),
	}

	dataBytes, err := json.Marshal(data)
	if err != nil {
		logger.ErrorContext(ctx, "failed to marshal event data",
			"error", err)
		return
	}

	// Forward the event to the webhook specified in the subscription
	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		subscription.WebhookURL,
		bytes.NewReader(dataBytes),
	)
	if err != nil {
		logger.ErrorContext(ctx, "failed to create request",
			"error", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", subscription.WebhookAccessToken)

	// Send the notification
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		logger.ErrorContext(ctx, "failed to send notification",
			"error", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusBadRequest {
		logger.ErrorContext(ctx, "webhook request failed with status",
			"status", resp.StatusCode)
	}
}

func StartListener(ctx context.Context, logger *slog.Logger, subscription db.Subscription, d *db.Database) error {
	// Get the operation associated with the subscription
	operation, err := d.GetOperationByID(subscription.OperationID)
	if err != nil {
		return fmt.Errorf("failed to get operation by ID %d: %w", subscription.OperationID, err)
	}

	// Extract operation connection details and settings
	var details map[string]string
	if err = json.Unmarshal(operation.Details, &details); err != nil {
		return fmt.Errorf("failed to unmarshal operation details: %w", err)
	}

	var settings map[string]string
	if err = json.Unmarshal(operation.Settings, &settings); err != nil {
		return fmt.Errorf("failed to unmarshal operation settings: %w", err)
	}

	// Validate required fields
	if err = validateOperationDetails(details); err != nil {
		return err
	}
	if err = validateOperationSettings(settings); err != nil {
		return err
	}

	// Convert port from string to int
	port, err := strconv.Atoi(details["port"])
	if err != nil {
		return fmt.Errorf("invalid port number '%s': %w", details["port"], err)
	}

	// Establish a connection to the PostgreSQL server
	pgClient, err := postgresclient.NewPostgresClient(
		details["host"],
		port,
		details["user"],
		details["password"],
		details["default_db"],
		details["ssl_mode"] == "true",
	)
	if err != nil {
		return fmt.Errorf("failed to create Postgres client: %w", err)
	}
	defer pgClient.Close()

	// Connect to the specified database
	dbClient, err := pgClient.WithDatabase(settings["database"])
	if err != nil {
		return fmt.Errorf("failed to connect to database '%s': %w", settings["database"], err)
	}
	defer dbClient.Close()

	// Set up notification triggers
	if err = postgresclient.SetupNotifications(dbClient); err != nil {
		return fmt.Errorf("failed to set up notifications: %w", err)
	}

	// Create a channel to handle context cancellation
	done := make(chan error, 1)

	// Start the notification listener
	if err = dbClient.StartNotificationListener(ctx, logger, "data_change", func(payload string) {
		handleNotification(ctx, logger, payload, settings, subscription)
	}); err != nil {
		return fmt.Errorf("failed to start notification listener: %w", err)
	}

	// Wait for context cancellation
	select {
	case <-ctx.Done():
		return ctx.Err()
	case err = <-done:
		return err
	}
}
