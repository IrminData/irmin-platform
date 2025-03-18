package postgresControllers

import (
	"encoding/json"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"net/http"

	"gorm.io/datatypes"
)

func OperationInit(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the system token
	if !utils.ValidateConnectorSystemToken(defaultConnectorInfo.Name, w, r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get connection settings and details from the request
	fields, err := utils.ParseFormFields(r, nil, []string{"details[host]", "details[port]", "details[user]", "details[password]", "details[default_db]", "details[ssl_mode]", "settings[database]"})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
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

	// Construct the details JSON
	details, err := json.Marshal(map[string]string{
		"host":       fields["details[host]"],
		"port":       fields["details[port]"],
		"user":       fields["details[user]"],
		"password":   fields["details[password]"],
		"default_db": fields["details[default_db]"],
		"ssl_mode":   fields["details[ssl_mode]"],
	})
	if err != nil {
		http.Error(w, "Failed to marshal details", http.StatusInternalServerError)
		return
	}

	// Construct the settings JSON
	settings, err := json.Marshal(map[string]string{
		"database": fields["settings[database]"],
	})
	if err != nil {
		http.Error(w, "Failed to marshal settings", http.StatusInternalServerError)
		return
	}

	// Create a new operation in the database
	newOperation, err := db.CreateOperation(&db.Operation{
		Details:                 datatypes.JSON(details),
		Settings:                datatypes.JSON(settings),
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
