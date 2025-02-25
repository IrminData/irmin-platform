package postgresClient

import (
	"context"
	"encoding/json"
	"fmt"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"log"
)

// InitPostgresClient initializes a PostgresClient instance based on the data provided in the operation.
func InitPostgresClient(ctx context.Context, operation *db.Operation) (*PostgresClient, *string, error) {

	// Extract operation connection details and settings
	var details map[string]string
	if err := json.Unmarshal(operation.Details, &details); err != nil {
		log.Printf("failed to unmarshal details: %v", err)
		return nil, nil, err
	}
	var settings map[string]string
	if err := json.Unmarshal(operation.Settings, &settings); err != nil {
		log.Printf("failed to unmarshal settings: %v", err)
		return nil, nil, err
	}

	// Extract connection details and settings
	host := details["host"]
	port, err := utils.StringToInt(details["port"])
	user := details["user"]
	password := details["password"]
	defaultDB := details["default_db"]
	sslMode := details["ssl_mode"] == "true"
	database := settings["database"]
	if err != nil {
		log.Printf("failed to extract connection details: %v", err)
		return nil, nil, err
	}

	// Check for missing required fields
	if host == "" || port == 0 || user == "" || password == "" || defaultDB == "" || database == "" {
		err := fmt.Errorf("missing required connection details or settings")
		log.Printf("missing required connection details or settings: %v", err)
		return nil, nil, err
	}

	// Establish a connection to the PostgreSQL server
	pgClient, err := NewPostgresClient(host, int(port), user, password, defaultDB, sslMode)
	if err != nil {
		return nil, nil, err
	}
	defer pgClient.Close() // Close the client at the end of the function

	// Connect to the specified database
	dbClient, err := pgClient.WithDatabase(database)
	if err != nil {
		pgClient.Close() // Close the initial client before returning
		return nil, nil, err
	}

	// Validate the credentials
	if err := dbClient.ValidateCredentials(ctx); err != nil {
		dbClient.Close() // Close the database client before returning
		pgClient.Close()
		return nil, nil, err
	}

	// Return the valid client without closing it prematurely
	return dbClient, &database, nil
}
