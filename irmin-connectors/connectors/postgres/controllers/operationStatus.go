package postgrescontrollers

import (
	"encoding/json"
	"irmin-connectors/connectors/postgres/config"
	"irmin-connectors/db"
	"irmin-connectors/lib"
	"irmin-connectors/utils"
	"time"

	irminconnectorclient "github.com/IrminData/irmin-sdk-go/connector"

	"net/http"
	"strconv"
)

// validateOperationRequest validates the operation request and returns the operation ID.
func (c *Controller) validateOperationRequest(w http.ResponseWriter, r *http.Request) (uint, error) {
	info := config.GetConnectorInfo()
	if !lib.ValidateConnectorSystemToken(c.DB, c.Logger, info.Name, w, r) {
		return 0, http.ErrNotSupported
	}

	fields, err := utils.ParseFormFields(r, []string{"operation_id"}, nil)
	if err != nil {
		return 0, err
	}

	operationID, err := strconv.Atoi(fields["operation_id"])
	if err != nil || operationID < 0 {
		return 0, http.ErrNotSupported
	}

	return uint(operationID), nil
}

// getOperationAndValidate retrieves and validates the operation.
func (c *Controller) getOperationAndValidate(operationID uint) (*db.Operation, error) {
	operation, err := c.DB.GetOperationByID(operationID)
	if err != nil || operation == nil {
		return nil, http.ErrNotSupported
	}

	connectorRegistration, err := c.DB.GetConnectorRegistrationByID(operation.ConnectorRegistrationID)
	if err != nil || connectorRegistration == nil ||
		connectorRegistration.ConnectorName != config.GetConnectorInfo().Name {
		return nil, http.ErrNotSupported
	}

	return operation, nil
}

// getOperationSubscriptions retrieves subscriptions for the operation.
func (c *Controller) getOperationSubscriptions(operationID uint) ([]db.Subscription, error) {
	subscriptions, err := c.DB.GetAllSubscriptions()
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

// OperationStatus handles the status check of an operation.
func (c *Controller) OperationStatus(w http.ResponseWriter, r *http.Request) {
	operationID, err := c.validateOperationRequest(w, r)
	if err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	operation, err := c.getOperationAndValidate(operationID)
	if err != nil {
		http.Error(w, "Operation not found", http.StatusNotFound)
		return
	}

	operationSubscriptions, err := c.getOperationSubscriptions(operation.ID)
	if err != nil {
		http.Error(w, "Failed to get subscriptions", http.StatusInternalServerError)
		return
	}

	detailsMap, settingsMap, err := parseOperationData(operation)
	if err != nil {
		http.Error(w, "Failed to parse operation data", http.StatusInternalServerError)
		return
	}

	response := irminconnectorclient.OperationStatus{
		OperationID:   operation.ID,
		Details:       detailsMap,
		Settings:      settingsMap,
		Subscriptions: convertToClientSubscriptions(operationSubscriptions),
	}

	w.Header().Set("Content-Type", "application/json")
	if err = json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}
