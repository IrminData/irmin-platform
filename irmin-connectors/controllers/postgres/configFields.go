package postgresControllers

import (
	"context"
	"encoding/json"
	"fmt"
	postgresClient "irmin-connectors/controllers/postgres/client"
	connectorModels "irmin-connectors/models"
	"irmin-connectors/utils"
	"net/http"

	"github.com/gorilla/mux"
)

func ConfigFields(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the system token
	if !utils.ValidateConnectorSystemToken(defaultConnectorInfo.Name, w, r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Retrieve the `key` from the path. E.g., "/configuration/details/fields" or "/configuration/settings/fields"
	vars := mux.Vars(r)
	key := vars["key"]

	// Parse form data (expects application/x-www-form-urlencoded or similar).
	if err := r.ParseForm(); err != nil {
		http.Error(w, "Invalid form data", http.StatusBadRequest)
		return
	}

	// We'll store our response fields in a map (keyed by string).
	var dynamicFields map[string]connectorModels.DynamicField

	// Switch on the key to decide what to return
	switch key {

	// "details" -> base connection info for the PostgreSQL server
	case "details":
		dynamicFields = map[string]connectorModels.DynamicField{
			"host": {
				Type:     "text",
				Label:    "Host",
				Example:  "localhost",
				Required: true,
				HelpText: "The hostname or IP address of the PostgreSQL server.",
			},
			"port": {
				Type:     "integer",
				Label:    "Port",
				Example:  "5432",
				Required: true,
				HelpText: "The port number on which PostgreSQL is listening.",
				Min:      1,
				Max:      65535,
			},
			"user": {
				Type:     "text",
				Label:    "User",
				Example:  "postgres",
				Required: true,
				HelpText: "The user name for connecting to the PostgreSQL database.",
			},
			"password": {
				Type:     "password",
				Label:    "Password",
				Required: true,
				HelpText: "The password for the specified PostgreSQL user.",
			},
			"ssl_mode": {
				Type:     "select",
				Label:    "SSL Mode",
				Required: true,
				HelpText: "Enable or disable SSL mode for the connection.",
				Options: []connectorModels.SelectOption{
					{Key: "true", Value: "Enabled"},
					{Key: "false", Value: "Disabled"},
				},
			},
		}

	// "settings" -> once the user has provided details (host, port, user, password),
	//               we connect, fetch available databases, and let them pick one.
	case "settings":
		// Extract the connection details from the form
		host := r.FormValue("details[host]")
		portStr := r.FormValue("details[port]")
		user := r.FormValue("details[user]")
		password := r.FormValue("details[password]")
		sslMode := r.FormValue("details[ssl_mode]") == "true"

		// Quick validation
		if host == "" || portStr == "" || user == "" {
			http.Error(w, "Missing required connection details: host, port, user", http.StatusBadRequest)
			return
		}

		// Convert port from string
		port := utils.StringToUint(portStr)

		// Create a client WITHOUT specifying a database (so we can fetch them)
		ctx := context.Background()
		pc, err := postgresClient.NewPostgresClient(host, int(port), user, password, sslMode)
		if err != nil {
			fmt.Printf("Error initialising Postgres client: %v\n", err)
			http.Error(w, "Failed to connect to the PostgreSQL server", http.StatusInternalServerError)
			return
		}
		defer pc.Close()

		// Validate the credentials (ping the server)
		if err := pc.ValidateCredentials(ctx); err != nil {
			fmt.Printf("Error validating Postgres credentials: %v\n", err)
			http.Error(w, "Failed to validate PostgreSQL credentials", http.StatusInternalServerError)
			return
		}

		// List all non-template databases
		dbs, err := pc.GetAvailableDatabases(ctx)
		if err != nil {
			fmt.Printf("Error fetching Postgres databases: %v\n", err)
			http.Error(w, "Failed to fetch PostgreSQL databases", http.StatusInternalServerError)
			return
		}

		if len(dbs) == 0 {
			http.Error(w, "No databases available", http.StatusInternalServerError)
			return
		}

		// Build a list of select options
		dbOptions := []connectorModels.SelectOption{}
		for _, dbName := range dbs {
			dbOptions = append(dbOptions, connectorModels.SelectOption{
				Key:   dbName,
				Value: dbName,
			})
		}

		// Our dynamic field: a "select" so the user can pick from the list
		dynamicFields = map[string]connectorModels.DynamicField{
			"database": {
				Type:     "select",
				Label:    "Database Name",
				Example:  "my_database",
				Required: true,
				HelpText: "The name of the database you want to connect to.",
				Options:  dbOptions,
			},
		}

	default:
		http.Error(w, "Invalid configuration key", http.StatusBadRequest)
		return
	}

	// Encode the resulting fields as JSON
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(dynamicFields); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
