package postgrescontrollers

import (
	"encoding/json"
	"irmin-connectors/connectors/postgres/config"
	"irmin-connectors/db"
	"irmin-connectors/lib"
	"irmin-connectors/utils"
	"net/http"

	"gorm.io/datatypes"
)

// OperationInit handles the initialization of a new operation.
func (c *Controller) OperationInit(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the system token
	info := config.GetConnectorInfo()
	if !lib.ValidateConnectorSystemToken(c.DB, c.Logger, info.Name, w, r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Get the form values from the request
	fields, err := utils.ParseFormFields(
		r,
		nil,
		[]string{
			"details[host]",
			"details[port]",
			"details[user]",
			"details[password]",
			"details[default_db]",
			"details[ssl_mode]",
			"settings[database]",
		},
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Find relevant connector registration
	connectorRegistrations, err := c.DB.GetConnectorRegistrationByConnectorName(info.Name)
	if err != nil {
		http.Error(w, "Failed to find connector registration", http.StatusInternalServerError)
		return
	}
	if len(connectorRegistrations) == 0 {
		http.Error(w, "Connector registration not found", http.StatusNotFound)
		return
	}
	connectorRegistration := connectorRegistrations[0]

	// Create a new operation token
	operationToken, err := utils.GenerateToken(utils.DefaultTokenLength)
	if err != nil {
		http.Error(w, "Failed to generate operation token", http.StatusInternalServerError)
		return
	}

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

	// Create a new operation
	operation := &db.Operation{
		Details:                 datatypes.JSON(details),
		Settings:                datatypes.JSON(settings),
		Token:                   operationToken,
		ConnectorRegistrationID: connectorRegistration.ID,
	}

	// Save the operation to the database
	operation, err = c.DB.CreateOperation(operation)
	if err != nil {
		http.Error(w, "Failed to create operation", http.StatusInternalServerError)
		return
	}

	// Send the response
	w.Header().Set("Content-Type", "application/json")
	if err = json.NewEncoder(w).Encode(operation); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}
