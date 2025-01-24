package postgresClient

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
)

// InitPostgresClient initializes a PostgresClient instance based on the form data in the HTTP request.
func InitPostgresClient(ctx context.Context, r *http.Request) (*PostgresClient, *string, error) {
	// Parse the form data
	if err := r.ParseForm(); err != nil {
		return nil, nil, err
	}

	// Extract fields for "details"
	host := r.FormValue("details[host]")
	portStr := r.FormValue("details[port]")
	user := r.FormValue("details[user]")
	password := r.FormValue("details[password]")
	defaultDB := r.FormValue("details[default_db]")
	sslMode := r.FormValue("details[ssl_mode]") == "true"

	// Extract fields for "settings"
	database := r.FormValue("settings[database]")

	// Check for missing required fields
	if host == "" || portStr == "" || user == "" || database == "" {
		return nil, nil, fmt.Errorf("missing required connection details: host, port, user, or database")
	}

	// Convert port from string to int
	port, err := strconv.Atoi(portStr)
	if err != nil {
		return nil, nil, err
	}

	// Establish a connection to the PostgreSQL server
	pgClient, err := NewPostgresClient(host, port, user, password, defaultDB, sslMode)
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
