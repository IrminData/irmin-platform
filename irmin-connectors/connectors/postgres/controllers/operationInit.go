package postgresControllers

import (
	"encoding/json"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"net/http"
)

func OperationInit(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the system token
	if !utils.ValidateConnectorSystemToken(defaultConnectorInfo.Name, w, r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Create a new operation token
	operationToken, err := utils.GenerateToken(32)
	if err != nil {
		http.Error(w, "Failed to generate operation token", http.StatusInternalServerError)
		return
	}

	// Find relevant connector registration
	connectorRegistrations, err := db.GetConnectorRegistrationByConnectorName(defaultConnectorInfo.Name)
	if err != nil {
		http.Error(w, "Failed to find connector registration", http.StatusInternalServerError)
		return
	}
	if len(connectorRegistrations) == 0 {
		http.Error(w, "Connector registration not found", http.StatusNotFound)
		return
	}
	connectorRegistration := connectorRegistrations[0]

	// Create a new operation in the database
	newOperation, err := db.CreateOperation(&db.Operation{
		Token:                   operationToken,
		ConnectorRegistrationID: connectorRegistration.ID,
	})
	if err != nil {
		http.Error(w, "Failed to create operation", http.StatusInternalServerError)
		return
	}
	if newOperation == nil {
		http.Error(w, "Failed to create operation", http.StatusInternalServerError)
		return
	}

	// Send the operation token
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(newOperation)
}
