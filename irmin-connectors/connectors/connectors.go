package connectors

import (
	"context"
	"encoding/json"
	postgresConnector "irmin-connectors/connectors/postgres"
	"irmin-connectors/db"
	"log"

	"github.com/gorilla/mux"
)

// SetupConnectorRoutes sets up the routes for all connectors
func SetupConnectorRoutes(r *mux.Router) *mux.Router {
	// Setup routes for each connector
	r = postgresConnector.SetupRoutes(r)
	// ... Add new connectors here ...

	return r
}

// StartConnectorSubsriptionListener starts a listener for a subscription with the correct connector
func StartConnectorSubsriptionListener(connectorName string, subscription db.Subscription, ctx context.Context) error {
	var err error

	// Start the listener using the correct connector
	switch connectorName {
	case "PostgreSQL":
		err = postgresConnector.StartListener(subscription, ctx)
	}
	// ... Add new connectors here ...

	if err != nil {
		return err
	}
	return nil
}

// RegisterAllConnectors registers all connectors
func RegisterAllConnectors(apiBaseURL, apiToken, url string) error {
	// Define the connectors to register
	connectors := []struct {
		Name string
		Slug string
	}{
		{"PostgreSQL", "postgres"},
		// ... Add new connectors here ...
	}

	// Loop through the connectors array and register each one.
	for _, conn := range connectors {
		newConnector, err := registerConnector(apiBaseURL, apiToken, url, conn.Name, conn.Slug)
		if err != nil {
			log.Printf("Error registering connector %s: %v", conn.Name, err)
			continue
		}
		connJSON, jsonErr := json.Marshal(newConnector)
		if jsonErr != nil {
			log.Printf("Error marshalling connector %s: %v", conn.Name, jsonErr)
			continue
		}
		log.Printf("Registered connector: %s", string(connJSON))
	}

	return nil
}
