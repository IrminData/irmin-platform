package lib

import (
	"fmt"
	"irmin-connectors/db"
	"net/http"
	"strings"
)

// ValidateConnectorSystemToken validates the provided token against the system token of the connector registration instance
func ValidateConnectorSystemToken(connectorName string, w http.ResponseWriter, r *http.Request) bool {
	// Get authentication bearer token from the request headers
	token := r.Header.Get("Authorization")
	token = strings.TrimPrefix(token, "Bearer ")

	// Fetch matching registerations by connector name
	registrations, err := db.GetConnectorRegistrationByConnectorName(connectorName)
	if err != nil {
		fmt.Printf("Error fetching connectors from the database: %v\n", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return false
	}
	if len(registrations) == 0 {
		fmt.Printf("No connector registration found with the name %s\n", connectorName)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return false
	}

	// Validate the provided token against the registration instance
	var validToken = false
	for _, registrationInstance := range registrations {
		if token == registrationInstance.SystemToken {
			validToken = true
		}
	}
	if !validToken {
		fmt.Println("Invalid token provided")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return false
	}
	return true
}
