package connectors

import (
	"context"
	"encoding/json"
	postgresconnector "irmin-connectors/connectors/postgres"
	"irmin-connectors/db"
	"irmin-connectors/models"
	"log/slog"
)

// SetupConnectorRoutes sets up the routes for all connectors.
func SetupConnectorRoutes(app *models.ConnectorsApp) {
	// Setup routes for each connector
	postgresconnector.SetupRoutes(app)
	// ... Add new connectors here ...
}

// StartConnectorSubscriptionListener starts a listener for a subscription with the correct connector.
func StartConnectorSubscriptionListener(
	ctx context.Context,
	connectorName string,
	subscription db.Subscription,
	d *db.Database,
	logger *slog.Logger,
) error {
	var err error

	// Start the listener using the correct connector
	if connectorName == "PostgreSQL" {
		err = postgresconnector.StartListener(ctx, logger, subscription, d)
	}
	// ... Add new connectors here ...

	if err != nil {
		return err
	}
	return nil
}

// RegisterAllConnectors registers all connectors.
func RegisterAllConnectors(
	database *db.Database,
	logger *slog.Logger,
	apiBaseURL, apiToken, url string,
) error {
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
		newConnector, err := registerConnector(database, logger, apiBaseURL, apiToken, url, conn.Name, conn.Slug)
		if err != nil {
			logger.Error("Error registering connector",
				"error", err,
				"connector_name", conn.Name)
			continue
		}
		connJSON, jsonErr := json.Marshal(newConnector)
		if jsonErr != nil {
			logger.Error("Error marshalling connector",
				"error", jsonErr,
				"connector_name", conn.Name)
			continue
		}
		logger.Info("Registered connector",
			"connector_name", conn.Name,
			"connector_json", string(connJSON))
	}

	return nil
}
