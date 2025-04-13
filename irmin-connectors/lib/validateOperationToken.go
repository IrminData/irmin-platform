package lib

import (
	"fmt"
	"irmin-connectors/db"
	"net/http"
	"strings"
)

func ValidateOperationToken(connectorName string, w http.ResponseWriter, r *http.Request) (bool, *db.ConnectorRegistration, *db.Operation) {
	// Get authentication bearer token from the request headers
	token := r.Header.Get("Authorization")
	token = strings.TrimPrefix(token, "Bearer ")

	// Fetch matching registerations by connector name
	registrations, err := db.GetConnectorRegistrationByConnectorName(connectorName)
	if err != nil {
		fmt.Printf("Error fetching connectors from the database: %v\n", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return false, nil, nil
	}
	if len(registrations) == 0 {
		fmt.Printf("No connector registration found with the name %s\n", connectorName)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return false, nil, nil
	}
	registration := registrations[0]

	// Fetch operations for the connector registration
	operations, err := db.GetOperationsByConnectorRegistrationID(registration.ID)
	if err != nil {
		fmt.Printf("Error fetching operations from the database: %v\n", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return false, nil, nil
	}

	// Validate the provided token against the active operations
	var validToken = false
	var matchedOperation db.Operation
	for _, operation := range operations {
		if token == operation.Token {
			validToken = true
			matchedOperation = operation
			break
		}
	}
	if !validToken {
		fmt.Println("Invalid token provided")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return false, &registration, nil
	}
	return true, &registration, &matchedOperation

}
