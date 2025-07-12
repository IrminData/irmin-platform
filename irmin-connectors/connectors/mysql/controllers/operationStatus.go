package mysqlcontrollers

import (
	"encoding/json"
	"errors"
	"fmt"
	"irmin-connectors/connectors/mysql/config"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"strconv"
	"time"

	irminconnectorclient "github.com/IrminData/irmin-sdk-go/connector"
	"github.com/gofiber/fiber/v3"
)

// OperationStatus handles the status check of an operation.
func (cs *Controllers) OperationStatus(c fiber.Ctx) error {
	fields, err := utils.ParseFormFields(c, []string{"operation_id"}, nil)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	operationIDInt, err := strconv.Atoi(fields["operation_id"])
	if err != nil || operationIDInt < 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid operation ID",
		})
	}
	operationID := uint(operationIDInt)

	operation, err := cs.getOperationAndValidate(operationID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Operation not found",
		})
	}

	operationSubscriptions, err := cs.getOperationSubscriptions(operation.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get subscriptions",
		})
	}

	detailsMap, settingsMap, err := parseOperationData(operation)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to parse operation data",
		})
	}

	response := irminconnectorclient.OperationStatus{
		OperationID:   operation.ID,
		Details:       detailsMap,
		Settings:      settingsMap,
		Subscriptions: convertToClientSubscriptions(operationSubscriptions),
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

// getOperationAndValidate retrieves and validates the operation.
func (cs *Controllers) getOperationAndValidate(operationID uint) (*db.Operation, error) {
	operation, err := cs.DB.GetOperationByID(operationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get operation: %w", err)
	}
	if operation == nil {
		return nil, errors.New("operation not found")
	}

	connectorRegistration, err := cs.DB.GetConnectorRegistrationByID(operation.ConnectorRegistrationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get connector registration: %w", err)
	}
	if connectorRegistration == nil {
		return nil, errors.New("connector registration not found")
	}
	if connectorRegistration.ConnectorName != config.GetConnectorInfo().Name {
		return nil, errors.New("operation belongs to different connector")
	}

	return operation, nil
}

// getOperationSubscriptions retrieves subscriptions for the operation.
func (cs *Controllers) getOperationSubscriptions(operationID uint) ([]db.Subscription, error) {
	subscriptions, err := cs.DB.GetAllSubscriptions()
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
func convertToClientSubscriptions(subs []db.Subscription) []irminconnectorclient.Subscription {
	clientSubscriptions := make([]irminconnectorclient.Subscription, len(subs))
	for i, sub := range subs {
		clientSubscriptions[i] = irminconnectorclient.Subscription{
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
