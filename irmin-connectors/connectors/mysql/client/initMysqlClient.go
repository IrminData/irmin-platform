package mysqlclient

import (
	"context"
	"encoding/json"
	mysqlmodels "irmin-connectors/connectors/mysql/models"
	"irmin-connectors/db"
	"log/slog"
)

// InitMySQLClient initializes a MySQLClient instance based on the data provided in the operation.
func InitMySQLClient(
	ctx context.Context,
	logger *slog.Logger,
	operation *db.Operation,
) (*MySQLClient, *string, error) {
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
	connectionDetails, err := mysqlmodels.NewConnectionDetailsFromMap(detailsMap)
	if err != nil {
		logger.ErrorContext(ctx, "failed to parse connection details",
			"error", err)
		return nil, nil, err
	}

	// Parse connection settings using model
	connectionSettings, err := mysqlmodels.NewConnectionSettingsFromMap(settingsMap)
	if err != nil {
		logger.ErrorContext(ctx, "failed to parse connection settings",
			"error", err)
		return nil, nil, err
	}

	// Use "mysql" as default if defaultDB is empty (since it's optional)
	defaultDB := connectionDetails.DefaultDB
	if defaultDB == "" {
		defaultDB = "mysql"
	}

	// Establish a connection to the MySQL server
	mysqlClient, err := NewMySQLClient(
		connectionDetails.Host,
		connectionDetails.Port,
		connectionDetails.Username,
		connectionDetails.Password,
		defaultDB,
	)
	if err != nil {
		logger.ErrorContext(ctx, "failed to create MySQL client",
			"error", err)
		return nil, nil, err
	}

	// Connect to the specified database (creates a new independent connection)
	dbClient, err := mysqlClient.WithDatabase(connectionSettings.Database)
	if err != nil {
		// Close the initial client on error
		if closeErr := mysqlClient.Close(); closeErr != nil {
			logger.ErrorContext(ctx, "failed to close initial MySQL client after WithDatabase error",
				"error", closeErr)
		}
		logger.ErrorContext(ctx, "failed to connect to database",
			"error", err)
		return nil, nil, err
	}

	// Close the initial client since dbClient is now a separate independent connection
	if closeErr := mysqlClient.Close(); closeErr != nil {
		logger.ErrorContext(ctx, "failed to close initial MySQL client",
			"error", closeErr)
	}

	// Validate the credentials on the database-specific client
	if err = dbClient.ValidateCredentials(ctx); err != nil {
		if closeErr := dbClient.Close(); closeErr != nil {
			logger.ErrorContext(ctx, "failed to close database client after validation error",
				"error", closeErr)
		}
		logger.ErrorContext(ctx, "failed to validate credentials",
			"error", err)
		return nil, nil, err
	}

	// Return the valid database client
	return dbClient, &connectionSettings.Database, nil
}
