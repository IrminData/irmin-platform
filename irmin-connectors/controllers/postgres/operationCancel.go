package postgresControllers

import (
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"net/http"
)

func OperationCancel(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the system token
	if !utils.ValidateConnectorSystemToken(defaultConnectorInfo.Name, w, r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Find the operation
	operationIDValue := r.FormValue("operation_id")
	if operationIDValue == "" {
		http.Error(w, "Operation ID is required", http.StatusBadRequest)
		return
	}
	operationID := utils.StringToUint(operationIDValue)
	operation, err := db.GetOperationByID(operationID)
	if err != nil {
		http.Error(w, "Failed to find operation", http.StatusInternalServerError)
		return
	}
	if operation == nil {
		http.Error(w, "Operation not found", http.StatusNotFound)
		return
	}

	// Make sure the operation is for the correct connector
	connectorRegistration, err := db.GetConnectorRegistrationByID(operation.ConnectorRegistrationID)
	if err != nil {
		http.Error(w, "Failed to find connector registration", http.StatusInternalServerError)
		return
	}
	if connectorRegistration == nil {
		http.Error(w, "Connector registration not found", http.StatusNotFound)
		return
	}
	if connectorRegistration.ConnectorName != defaultConnectorInfo.Name {
		http.Error(w, "Operation not found", http.StatusNotFound)
		return
	}

	// Cancel the operation
	if err := db.DeleteOperation(operation.ID); err != nil {
		http.Error(w, "Failed to cancel operation", http.StatusInternalServerError)
		return
	}

	// Send success response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message": "Operation canceled"}`))
}
