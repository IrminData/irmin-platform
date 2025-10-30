package common

import (
	"encoding/json"
	"errors"
	"fmt"
	"irmin-connectors/db"
	"irmin-connectors/models"
	"irmin-connectors/utils"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
)

// Subscription represents a record of an active subscription to changes in data.
type Subscription struct {
	ID                      uint    `json:"ID"                        example:"1"`
	CreatedAt               string  `json:"created_at"                example:"2021-01-01T00:00:00Z"`
	UpdatedAt               string  `json:"updated_at"                example:"2021-01-01T00:00:00Z"`
	DeletedAt               *string `json:"deleted_at,omitempty"      example:"2021-01-01T00:00:00Z"`
	WebhookURL              string  `json:"webhook_url"               example:"https://example.com/webhook"`
	WebhookAccessToken      string  `json:"webhook_access_token"      example:"1234567890"`
	ConnectorRegistrationID uint    `json:"connector_registration_id" example:"1"`
	OperationID             uint    `json:"operation_id"              example:"1"`
}

// OperationLog represents a record of a log tied to an operation.
type OperationLog struct {
	CreatedAt string         `json:"created_at"`
	Type      string         `json:"type"`
	Message   string         `json:"message"`
	Metadata  map[string]any `json:"metadata"`
}

// OperationStatus represents the response for an operation status check.
type OperationStatus struct {
	OperationID   uint              `json:"operation_id"`
	CreatedAt     string            `json:"created_at"`
	UpdatedAt     string            `json:"updated_at"`
	DeletedAt     *string           `json:"deleted_at,omitempty"`
	Details       map[string]string `json:"details"`
	Settings      map[string]string `json:"settings"`
	Subscriptions []Subscription    `json:"subscriptions"`
	Logs          []OperationLog    `json:"logs"`
}

// HandleOperationStatus provides common operation status handling logic.
// It validates the operation, retrieves subscriptions, and formats the response
// according to the SDK's OperationStatus format.
func HandleOperationStatus(
	c fiber.Ctx,
	getConnectorInfo func() models.ConnectorDetails,
	app *models.ConnectorsApp,
) error {
	// Parse form fields to get operation ID
	fields, err := utils.ParseFormFields(c, []string{"operation_id"}, nil)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Validate and convert operation ID
	operationIDInt, err := strconv.Atoi(fields["operation_id"])
	if err != nil || operationIDInt < 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid operation ID",
		})
	}
	operationID := uint(operationIDInt)

	// Get and validate the operation
	operation, err := getOperationAndValidate(operationID, getConnectorInfo(), app)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Operation not found",
		})
	}

	// Get operation subscriptions
	operationSubscriptions, err := getOperationSubscriptions(operation.ID, app)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get subscriptions",
		})
	}

	// Parse operation data
	detailsMap, settingsMap, err := parseOperationData(operation)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to parse operation data",
		})
	}

	// Convert deleted at to string if it is valid
	var deletedAt *string
	if operation.DeletedAt.Valid {
		deletedAtString := operation.DeletedAt.Time.Format(time.RFC3339)
		deletedAt = &deletedAtString
	}

	// Build response
	response := OperationStatus{
		OperationID:   operation.ID,
		CreatedAt:     operation.CreatedAt.Format(time.RFC3339),
		UpdatedAt:     operation.UpdatedAt.Format(time.RFC3339),
		DeletedAt:     deletedAt,
		Details:       detailsMap,
		Settings:      settingsMap,
		Subscriptions: convertToClientSubscriptions(operationSubscriptions),
		Logs:          convertToClientLogs(operation.Logs),
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

// getOperationAndValidate retrieves and validates the operation.
func getOperationAndValidate(
	operationID uint,
	connectorInfo models.ConnectorDetails,
	app *models.ConnectorsApp,
) (*db.Operation, error) {
	operation, err := app.DB.GetOperationByID(operationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get operation: %w", err)
	}
	if operation == nil {
		return nil, errors.New("operation not found")
	}

	connectorRegistration, err := app.DB.GetConnectorRegistrationByID(operation.ConnectorRegistrationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get connector registration: %w", err)
	}
	if connectorRegistration == nil {
		return nil, errors.New("connector registration not found")
	}

	// Validate that the operation belongs to the same connector
	if connectorRegistration.ConnectorName != connectorInfo.Name {
		return nil, errors.New("operation belongs to different connector")
	}

	return operation, nil
}

// getOperationSubscriptions retrieves subscriptions for the operation.
func getOperationSubscriptions(operationID uint, app *models.ConnectorsApp) ([]db.Subscription, error) {
	subscriptions, err := app.DB.GetAllSubscriptions()
	if err != nil {
		return nil, err
	}

	var operationSubscriptions []db.Subscription
	for _, sub := range subscriptions {
		if sub.OperationID == operationID {
			operationSubscriptions = append(operationSubscriptions, sub)
		}
	}
	return operationSubscriptions, nil
}

// parseOperationData parses operation details and settings from JSON.
func parseOperationData(operation *db.Operation) (map[string]string, map[string]string, error) {
	var detailsMap map[string]string
	if err := json.Unmarshal(operation.Details, &detailsMap); err != nil {
		return nil, nil, err
	}

	var settingsMap map[string]string
	if err := json.Unmarshal(operation.Settings, &settingsMap); err != nil {
		return nil, nil, err
	}

	return detailsMap, settingsMap, nil
}

// convertToClientSubscriptions converts DB subscriptions to client subscriptions.
func convertToClientSubscriptions(subs []db.Subscription) []Subscription {
	clientSubscriptions := make([]Subscription, len(subs))
	for i, sub := range subs {
		clientSubscriptions[i] = Subscription{
			ID:                      sub.ID,
			CreatedAt:               sub.CreatedAt.Format(time.RFC3339),
			UpdatedAt:               sub.UpdatedAt.Format(time.RFC3339),
			WebhookURL:              sub.WebhookURL,
			WebhookAccessToken:      sub.WebhookAccessToken,
			ConnectorRegistrationID: sub.ConnectorRegistrationID,
			OperationID:             sub.OperationID,
		}
	}
	return clientSubscriptions
}

// convertToClientLogs converts DB logs to client logs.
func convertToClientLogs(logs []db.OperationLog) []OperationLog {
	clientLogs := make([]OperationLog, len(logs))
	for i, log := range logs {
		clientLogs[i] = OperationLog{
			CreatedAt: log.CreatedAt.Format(time.RFC3339),
			Type:      string(log.Type),
			Message:   log.Message,
		}
		if log.Metadata == nil {
			continue
		}
		var metadata map[string]any
		if err := json.Unmarshal(log.Metadata, &metadata); err != nil {
			continue
		}
		clientLogs[i].Metadata = metadata
	}
	return clientLogs
}
