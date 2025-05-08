package postgrescontrollers

import (
	"context"
	"encoding/json"
	"fmt"
	postgresclient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/connectors/postgres/config"
	"irmin-connectors/lib"
	"irmin-connectors/models"
	"irmin-connectors/utils"
	"net/http"
	"strconv"
)

func validateConnectionDetails(host, portStr, user string) []string {
	var errors []string
	if host == "" || portStr == "" || user == "" {
		errors = append(errors, "Missing required connection details: host, port, or user.")
	}
	return errors
}

func validateDatabaseConnection(
	ctx context.Context,
	pc *postgresclient.PostgresClient,
	database string,
) (bool, []string) {
	var errors []string
	if database == "" {
		return false, errors
	}

	dbClient, err := pc.WithDatabase(database)
	if err != nil {
		errors = append(errors, fmt.Sprintf("Error connecting to database '%s': %v", database, err))
		return false, errors
	}
	defer dbClient.Close()

	if err = dbClient.ValidateCredentials(ctx); err != nil {
		errors = append(errors, fmt.Sprintf("Unable to validate credentials for database '%s': %v", database, err))
		return false, errors
	}
	return true, errors
}

func validateServerConnection(
	ctx context.Context,
	host string,
	port int,
	user string,
	password string,
	defaultDB string,
	sslMode bool,
	database string,
) (bool, bool, bool, []string) {
	var errors []string
	canConnect := false
	connectionDetailsValid := false
	connectionSettingsValid := false

	pc, err := postgresclient.NewPostgresClient(host, port, user, password, defaultDB, sslMode)
	if err != nil {
		errors = append(errors, fmt.Sprintf("Failed to connect to PostgreSQL server: %v", err))
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}
	defer pc.Close()

	if err = pc.ValidateCredentials(ctx); err != nil {
		errors = append(errors, fmt.Sprintf("Invalid server credentials or unable to connect: %v", err))
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}

	canConnect = true
	connectionDetailsValid = true

	// Validate database connection if specified
	var dbErrors []string
	connectionSettingsValid, dbErrors = validateDatabaseConnection(ctx, pc, database)
	errors = append(errors, dbErrors...)

	return canConnect, connectionDetailsValid, connectionSettingsValid, errors
}

// ConfigValidate handles the configuration validation endpoint.
func (c *Controller) ConfigValidate(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the system token
	info := config.GetConnectorInfo()
	if !lib.ValidateConnectorSystemToken(c.DB, c.Logger, info.Name, w, r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Prepare a context for database ops, plus a slice to store errors.
	ctx := context.Background()
	var errors []string

	// Default states
	canConnect := false
	connectionDetailsValid := false
	connectionSettingsValid := false

	// Get connection settings and details from the request
	fields, err := utils.ParseFormFields(
		r,
		nil,
		[]string{
			"details[host]",
			"details[port]",
			"details[user]",
			"details[password]",
			"details[default_db]",
			"details[ssl_mode]",
			"settings[database]",
		},
	)
	if err != nil {
		errors = append(errors, err.Error())
	}

	host := fields["details[host]"]
	portStr := fields["details[port]"]
	user := fields["details[user]"]
	password := fields["details[password]"]
	defaultDB := fields["details[default_db]"]
	sslMode := fields["details[ssl_mode]"] == "true"
	database := fields["settings[database]"]

	// Validate connection details
	errors = append(errors, validateConnectionDetails(host, portStr, user)...)

	// If no blocking errors so far, try to connect to the server
	if len(errors) == 0 {
		var port int
		port, err = strconv.Atoi(portStr)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Invalid port number: %v", err))
		} else {
			var connErrors []string
			canConnect, connectionDetailsValid, connectionSettingsValid, connErrors = validateServerConnection(
				ctx, host, port, user, password, defaultDB, sslMode, database,
			)
			errors = append(errors, connErrors...)
		}
	}

	// Final "ok" means no errors were accumulated
	ok := (len(errors) == 0) && canConnect && connectionDetailsValid && connectionSettingsValid

	// Build and send the final response
	response := models.ValidationResponse{
		Ok:                      ok,
		CanConnect:              canConnect,
		ConnectionDetailsValid:  connectionDetailsValid,
		ConnectionSettingsValid: connectionSettingsValid,
		Errors:                  errors,
	}

	w.Header().Set("Content-Type", "application/json")
	if err = json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
		return
	}
}
