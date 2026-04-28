package connectors

import (
	"context"
	"encoding/json"

	firecrawlconnector "irmin-connectors/connectors/firecrawl"
	httpconnector "irmin-connectors/connectors/http"
	linearconnector "irmin-connectors/connectors/linear"
	mysqlconnector "irmin-connectors/connectors/mysql"
	pineconeconnector "irmin-connectors/connectors/pinecone"
	postgresconnector "irmin-connectors/connectors/postgres"
	sftpconnector "irmin-connectors/connectors/sftp"
	stripeconnector "irmin-connectors/connectors/stripe"
	"irmin-connectors/db"
	"irmin-connectors/listeners"
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
	firecrawlconnector.SetupRoutes(app)
	pineconeconnector.SetupRoutes(app)
	stripeconnector.SetupRoutes(app)
	linearconnector.SetupRoutes(app)
	// ... Add new connectors here ...
}

// SetupListenerManager creates a new listener manager and registers all connector listeners.
func SetupListenerManager(logger *slog.Logger, database *db.Database) *listeners.Manager {
	manager := listeners.NewManager(logger, database)

	// Register listener functions for connectors that support patch_event
	manager.RegisterConnectorListener("PostgreSQL", postgresconnector.StartListener)
	manager.RegisterConnectorListener("MySQL", mysqlconnector.StartListener)
	// ... Add new connector listeners here ...

	return manager
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
		{"Firecrawl", "firecrawl"},
		{"Pinecone", "pinecone"},
		{"Stripe", "stripe"},
		{"Linear", "linear"},
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
