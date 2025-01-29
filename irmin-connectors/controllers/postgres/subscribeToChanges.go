package postgresControllers

import (
	"context"
	"encoding/json"
	postgresClient "irmin-connectors/controllers/postgres/client"
	"irmin-connectors/db"
	connectorModels "irmin-connectors/models"
	"irmin-connectors/utils"
	"net/http"
)

func SubscribeToChanges(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the operation token
	tokenValid, registration, operation := utils.ValidateOperationToken(defaultConnectorInfo.Name, w, r)
	if !tokenValid {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse the form data (including file uploads)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		http.Error(w, "Invalid form data: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Prepare a context for database operations
	ctx := context.Background()

	// Initialise the Postgres client
	dbClient, database, err := postgresClient.InitPostgresClient(ctx, r)
	if err != nil || database == nil || dbClient == nil {
		http.Error(w, "Failed to initialise Postgres client: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer dbClient.Close()

	// Get the details from the request
	subcription_type := r.FormValue("type")
	webhook_url := r.FormValue("webhook_url")
	webhook_access_token := r.FormValue("webhook_access_token")

	// Extract fields for connection details
	host := r.FormValue("details[host]")
	portStr := r.FormValue("details[port]")
	user := r.FormValue("details[user]")
	password := r.FormValue("details[password]")
	defaultDB := r.FormValue("details[default_db]")
	sslMode := r.FormValue("details[ssl_mode]")

	// Create JSON strings of the connection detail
	connectionDetails, err := json.Marshal(map[string]string{
		"host":       host,
		"port":       portStr,
		"user":       user,
		"password":   password,
		"default_db": defaultDB,
		"ssl_mode":   sslMode,
	})
	if err != nil {
		http.Error(w, "Failed to create connection details: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Create JSON strings of the connection settings
	connectionSettings, err := json.Marshal(map[string]string{
		"database": *database,
	})
	if err != nil {
		http.Error(w, "Failed to create connection settings: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Create a new subscription record in the database
	subscription, err := db.CreateSubscription(&connectorModels.Subscription{
		ConnectorRegistrationID: registration.ID,
		OperationID:             operation.ID,
		SubscriptionType:        subcription_type,
		WebhookUrl:              webhook_url,
		WebhookAccessToken:      webhook_access_token,
		ConnectionDetails:       string(connectionDetails),
		ConnectionSettings:      string(connectionSettings),
	})
	if err != nil {
		http.Error(w, "Failed to create subscription: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Start the listener for the new subscription
	err = SetupNotifications(dbClient)
	if err != nil {
		http.Error(w, "Failed to setup notifications: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Marshal the subscription record to JSON
	subscriptionJSON, err := json.Marshal(subscription)
	if err != nil {
		http.Error(w, "Failed to marshal subscription: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Send success response
	w.WriteHeader(http.StatusOK)
	w.Header().Set("Content-Type", "application/json")
	w.Write(subscriptionJSON)
}
