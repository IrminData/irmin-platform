package postgresControllers

import (
	"context"
	"encoding/json"
	postgresClient "irmin-connectors/controllers/postgres/client"
	"irmin-connectors/db"
	connectorModels "irmin-connectors/models"
	"irmin-connectors/utils"
	"net/http"
	"os"
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

	// Create a new subscription record in the database
	subscription, err := db.CreateSubscription(&connectorModels.Subscription{
		ConnectorRegistrationID: registration.ID,
		OperationID:             operation.ID,
		SubscriptionType:        subcription_type,
		WebhookUrl:              webhook_url,
		WebhookAccessToken:      webhook_access_token,
	})
	if err != nil {
		http.Error(w, "Failed to create subscription: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Remove all existing notification triggers for all tables in the database
	content, err := os.ReadFile("controllers/postgres/client/remove_triggers_for_all_tables.sql")
	if err != nil {
		http.Error(w, "Failed to read trigger script: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if _, err := dbClient.Exec(context.Background(), string(content)); err != nil {
		http.Error(w, "Failed to remove triggers: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Create notification triggers for all tables in the database
	content, err = os.ReadFile("controllers/postgres/client/create_triggers_for_all_tables.sql")
	if err != nil {
		http.Error(w, "Failed to read trigger script: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if _, err := dbClient.Exec(context.Background(), string(content)); err != nil {
		http.Error(w, "Failed to create triggers: "+err.Error(), http.StatusInternalServerError)
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
