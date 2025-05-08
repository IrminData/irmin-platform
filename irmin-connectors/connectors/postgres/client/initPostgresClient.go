package postgresclient

import (
	"context"
	"encoding/json"
	"errors"
	"irmin-connectors/db"
	"log/slog"
	"strconv"
)

// InitPostgresClient initializes a PostgresClient instance based on the data provided in the operation.
func InitPostgresClient(
	ctx context.Context,
	logger *slog.Logger,
	operation *db.Operation,
) (*PostgresClient, *string, error) {
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
	sslMode := details["ssl_mode"] == "true"
	database := settings["database"]
	if err != nil {
		logger.ErrorContext(ctx, "failed to extract connection details",
			"error", err)
		return nil, nil, err
	}

	// Check for missing required fields
	if host == "" || port == 0 || user == "" || password == "" || defaultDB == "" || database == "" {
		err = errors.New("missing required connection details or settings")
		logger.ErrorContext(ctx, "missing required connection details or settings",
			"error", err)
		return nil, nil, err
	}

	// Establish a connection to the PostgreSQL server
	pgClient, err := NewPostgresClient(host, port, user, password, defaultDB, sslMode)
	if err != nil {
		logger.ErrorContext(ctx, "failed to create Postgres client",
			"error", err)
		return nil, nil, err
	}
	defer pgClient.Close() // Close the client at the end of the function

	// Connect to the specified database
	dbClient, err := pgClient.WithDatabase(database)
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
	return dbClient, &database, nil
}
