package postgresControllers

import (
	"context"
	"encoding/json"
	"fmt"
	postgresClient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/models"
	"irmin-connectors/utils"
	"net/http"
)

func ConfigValidate(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the system token
	if !utils.ValidateConnectorSystemToken(defaultConnectorInfo.Name, w, r) {
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
	fields, err := utils.ParseFormFields(r, []string{"details[host]", "details[port]", "details[user]", "details[password]", "details[default_db]", "details[ssl_mode]", "settings[database]"})
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

	// Check for missing required fields
	if host == "" || portStr == "" || user == "" {
		errors = append(errors, "Missing required connection details: host, port, or user.")
	}

	// If no blocking errors so far, try to connect to the server
	if len(errors) == 0 {
		port, err := utils.StringToInt(portStr)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Invalid port number: %v", err))
		}
		pc, err := postgresClient.NewPostgresClient(host, int(port), user, password, defaultDB, sslMode)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Failed to connect to PostgreSQL server: %v", err))
		} else {
			defer pc.Close()

			// Validate server credentials
			if err := pc.ValidateCredentials(ctx); err != nil {
				errors = append(errors, fmt.Sprintf("Invalid server credentials or unable to connect: %v", err))
			} else {
				// If we get here, we can connect at the server level
				canConnect = true
				connectionDetailsValid = true

				// 6. If a specific database is provided, test connectivity to it
				if database != "" {
					dbClient, err := pc.WithDatabase(database)
					if err != nil {
						errors = append(errors, fmt.Sprintf("Error connecting to database '%s': %v", database, err))
					} else {
						defer dbClient.Close()
						if err := dbClient.ValidateCredentials(ctx); err != nil {
							errors = append(errors, fmt.Sprintf("Unable to validate credentials for database '%s': %v", database, err))
						} else {
							connectionSettingsValid = true
						}
					}
				} else {
					// No database provided, so we can't test connectivity to it
					connectionSettingsValid = false
				}
			}
		}
	}

	// Final "ok" means no errors were accumulated
	ok := (len(errors) == 0) && canConnect && connectionDetailsValid && connectionSettingsValid

	// Build and send the final response
	resp := models.ValidationResponse{
		Ok:                      ok,
		CanConnect:              canConnect,
		ConnectionDetailsValid:  connectionDetailsValid,
		ConnectionSettingsValid: connectionSettingsValid,
		Errors:                  errors,
	}

	w.Header().Set("Content-Type", "application/json")
	if !ok {
		// You can choose a suitable error code. 400 is common for "invalid input / validation fails."
		w.WriteHeader(http.StatusBadRequest)
	}
	_ = json.NewEncoder(w).Encode(resp)
}
