package utils

import (
	"fmt"
	"irmin-connectors/db"
	connectorModels "irmin-connectors/models"
	"net/http"
	"strings"
)

// ValidateConnectorSystemToken validates the provided token against the system token of the connector registration instance
func ValidateConnectorSystemToken(connectorName string, w http.ResponseWriter, r *http.Request) {
	// Get authentication bearer token from the request headers
	token := r.Header.Get("Authorization")
	token = strings.TrimPrefix(token, "Bearer ")

	// Fetch matching registered connectors
	connectors, err := db.GetConnectorsByName(connectorName)
	if err != nil {
		fmt.Printf("Error fetching connectors from the database: %v\n", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
	var connector *connectorModels.ConnectorInfo
	if len(connectors) > 0 {
		connector = &connectors[0]
	}
	if connector == nil || connector.ID == "" {
		fmt.Printf("No connector found with the name %s\n", connectorName)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}

	// Find registration instance for the matched connector
	registration, err := db.GetConnectorRegistrationsByConnectorID(connector.ID)
	if err != nil {
		fmt.Printf("Error fetching connector registrations from the database: %v\n", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
	var registrationInstance *connectorModels.ConnectorRegistration
	if len(registration) > 0 {
		registrationInstance = &registration[0]
	}
	if registrationInstance == nil || registrationInstance.ID == "" {
		fmt.Printf("No registration found for the connector %s\n", connectorName)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}

	// Validate the provided token against the registration instance
	if token != registrationInstance.SystemToken {
		fmt.Println("Invalid token provided")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
	}
}
