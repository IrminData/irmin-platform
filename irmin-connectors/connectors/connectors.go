package connectors

import (
	"context"
	"encoding/json"
	httpconnector "irmin-connectors/connectors/http"
	mysqlconnector "irmin-connectors/connectors/mysql"
	postgresconnector "irmin-connectors/connectors/postgres"
	sftpconnector "irmin-connectors/connectors/sftp"
	"irmin-connectors/db"
	"irmin-connectors/models"
	"log/slog"
)

// SetupConnectorRoutes sets up the routes for all connectors.
func SetupConnectorRoutes(app *models.ConnectorsApp) {
	// Setup routes for each connector
	postgresconnector.SetupRoutes(app)
	mysqlconnector.SetupRoutes(app)
	sftpconnector.SetupRoutes(app)
	httpconnector.SetupRoutes(app)
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
	switch connectorName {
	case "PostgreSQL":
		err = postgresconnector.StartListener(ctx, logger, subscription, d)
	case "MySQL":
		err = mysqlconnector.StartListener(ctx, logger, subscription, d)
	}
	// ... Add new connectors here ...

	if err != nil {
		return err
	}
	return nil
}

// RegisterAllConnectors registers all connectors.
func RegisterAllConnectors(
	ctx context.Context,
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
		{"MySQL", "mysql"},
		{"SFTP", "sftp"},
		{"HTTP", "http"},
		// ... Add new connectors here ...
	}

	// Loop through the connectors array and register each one.
	for _, conn := range connectors {
		newConnector, err := registerConnector(ctx, database, logger, apiBaseURL, apiToken, url, conn.Name, conn.Slug)
		if err != nil {
			logger.ErrorContext(ctx, "Error registering connector",
				"connector_name", conn.Name,
				"error", err)
			continue
		}
		connJSON, jsonErr := json.Marshal(newConnector)
		if jsonErr != nil {
			logger.ErrorContext(ctx, "Error marshalling connector",
				"connector_name", conn.Name,
				"error", jsonErr)
			continue
		}
		logger.InfoContext(ctx, "Registered connector",
			"connector_name", conn.Name,
			"connector_json", string(connJSON),
		)
	}

	return nil
}
