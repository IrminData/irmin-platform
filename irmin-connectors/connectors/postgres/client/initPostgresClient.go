package postgresclient

import (
	"context"
	"encoding/json"
	postgresmodels "irmin-connectors/connectors/postgres/models"
	"irmin-connectors/db"
	"log/slog"
)

// InitPostgresClient initializes a PostgresClient instance based on the data provided in the operation.
func InitPostgresClient(
	ctx context.Context,
	logger *slog.Logger,
	operation *db.Operation,
) (*PostgresClient, *string, error) {
	// Extract operation connection details and settings
	var detailsMap map[string]any
	if err := json.Unmarshal(operation.Details, &detailsMap); err != nil {
		logger.ErrorContext(ctx, "failed to unmarshal details",
			"error", err)
		return nil, nil, err
	}
	var settingsMap map[string]any
	if err := json.Unmarshal(operation.Settings, &settingsMap); err != nil {
		logger.ErrorContext(ctx, "failed to unmarshal settings",
			"error", err)
		return nil, nil, err
	}

	// Parse connection details using model
	connectionDetails, err := postgresmodels.NewConnectionDetailsFromMap(detailsMap)
	if err != nil {
		logger.ErrorContext(ctx, "failed to parse connection details",
			"error", err)
		return nil, nil, err
	}

	// Parse connection settings using model
	connectionSettings, err := postgresmodels.NewConnectionSettingsFromMap(settingsMap)
	if err != nil {
		logger.ErrorContext(ctx, "failed to parse connection settings",
			"error", err)
		return nil, nil, err
	}

	// Establish a connection to the PostgreSQL server
	pgClient, err := NewPostgresClient(
		ctx,
		connectionDetails.Host,
		connectionDetails.Port,
		connectionDetails.Username,
		connectionDetails.Password,
		connectionDetails.DefaultDB,
		connectionDetails.SSLMode,
	)
	if err != nil {
		logger.ErrorContext(ctx, "failed to create Postgres client",
			"error", err)
		return nil, nil, err
	}
	defer pgClient.Close() // Close the client at the end of the function

	// Connect to the specified database
	dbClient, err := pgClient.WithDatabase(ctx, connectionSettings.Database)
	if err != nil {
		pgClient.Close() // Close the initial client before returning
		logger.ErrorContext(ctx, "failed to connect to database",
			"error", err)
		return nil, nil, err
	}

	// Validate the credentials
	if err = dbClient.ValidateCredentials(ctx); err != nil {
		dbClient.Close() // Close the database client before returning
		pgClient.Close()
		logger.ErrorContext(ctx, "failed to validate credentials",
			"error", err)
		return nil, nil, err
	}

	// Return the valid client without closing it prematurely
	return dbClient, &connectionSettings.Database, nil
}
