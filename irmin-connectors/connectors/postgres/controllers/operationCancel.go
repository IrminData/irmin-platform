package postgrescontrollers

import (
	"irmin-connectors/connectors/postgres/config"
	"irmin-connectors/lib"
	"irmin-connectors/utils"
	"net/http"
	"strconv"
)

// OperationCancel handles the cancellation of an operation.
func (c *Controller) OperationCancel(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the system token
	info := config.GetConnectorInfo()
	if !lib.ValidateConnectorSystemToken(c.DB, c.Logger, info.Name, w, r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get the form values from the request
	fields, err := utils.ParseFormFields(r, []string{"operation_id"}, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Find the operation
	operationID, err := strconv.Atoi(fields["operation_id"])
	if err != nil {
		http.Error(w, "Invalid operation ID", http.StatusBadRequest)
		return
	}
	if operationID < 0 {
		http.Error(w, "Invalid operation ID", http.StatusBadRequest)
		return
	}
	operation, err := c.DB.GetOperationByID(uint(operationID))
	if err != nil {
		http.Error(w, "Failed to find operation", http.StatusInternalServerError)
		return
	}
	if operation == nil {
		http.Error(w, "Operation not found", http.StatusNotFound)
		return
	}

	// Make sure the operation is for the correct connector
	connectorRegistration, err := c.DB.GetConnectorRegistrationByID(operation.ConnectorRegistrationID)
	if err != nil {
		http.Error(w, "Failed to find connector registration", http.StatusInternalServerError)
		return
	}
	if connectorRegistration == nil {
		http.Error(w, "Connector registration not found", http.StatusNotFound)
		return
	}
	if connectorRegistration.ConnectorName != info.Name {
		http.Error(w, "Operation not found", http.StatusNotFound)
		return
	}

	// Delete subscriptions associated with the operation
	if err = c.DB.DeleteSubscriptionsByOperationID(operation.ID); err != nil {
		http.Error(w, "Failed to delete subscriptions", http.StatusInternalServerError)
		return
	}

	// Cancel the operation
	if err = c.DB.DeleteOperation(operation.ID); err != nil {
		http.Error(w, "Failed to cancel operation", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}
