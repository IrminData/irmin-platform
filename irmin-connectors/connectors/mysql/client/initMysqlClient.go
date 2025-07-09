package mysqlclient

import (
	"context"
	"encoding/json"
	"errors"
	"irmin-connectors/db"
	"log/slog"
	"strconv"
)

// InitMySQLClient initializes a MySQLClient instance based on the data provided in the operation.
func InitMySQLClient(
	ctx context.Context,
	logger *slog.Logger,
	operation *db.Operation,
) (*MySQLClient, *string, error) {
	// Extract operation connection details and settings
	var details map[string]string
	if err := json.Unmarshal(operation.Details, &details); err != nil {
		logger.ErrorContext(ctx, "failed to unmarshal details",
			"error", err)
		return nil, nil, err
	}
	var settings map[string]string
	if err := json.Unmarshal(operation.Settings, &settings); err != nil {
		logger.ErrorContext(ctx, "failed to unmarshal settings",
			"error", err)
		return nil, nil, err
	}

	// Extract connection details and settings
	host := details["host"]
	port, err := strconv.Atoi(details["port"])
	user := details["user"]
	password := details["password"]
	defaultDB := details["default_db"]
	database := settings["database"]
	if err != nil {
		logger.ErrorContext(ctx, "failed to extract connection details",
			"error", err)
		return nil, nil, err
	}

	// Use "mysql" as default if defaultDB is empty (since it's optional)
	if defaultDB == "" {
		defaultDB = "mysql"
	}

	// Check for missing required fields (defaultDB is optional)
	if host == "" || port == 0 || user == "" || password == "" || database == "" {
		err = errors.New("missing required connection details or settings")
		logger.ErrorContext(ctx, "missing required connection details or settings",
			"error", err)
		return nil, nil, err
	}

	// Establish a connection to the MySQL server
	mysqlClient, err := NewMySQLClient(host, port, user, password, defaultDB)
	if err != nil {
		logger.ErrorContext(ctx, "failed to create MySQL client",
			"error", err)
		return nil, nil, err
	}

	// Connect to the specified database (creates a new independent connection)
	dbClient, err := mysqlClient.WithDatabase(database)
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
	return dbClient, &database, nil
}
