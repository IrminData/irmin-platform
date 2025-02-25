package postgresControllers

import (
	"context"
	"encoding/json"
	postgresClient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/db"
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
	dbClient, database, err := postgresClient.InitPostgresClient(ctx, operation)
	if err != nil || database == nil || dbClient == nil {
		http.Error(w, "Failed to initialise Postgres client: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer dbClient.Close()

	// Get required fields from the request
	fields, err := utils.ParseRequiredFormFields(r, []string{"webhook_url", "webhook_access_token"})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Create a new subscription record in the database
	subscription, err := db.CreateSubscription(&db.Subscription{
		ConnectorRegistrationID: registration.ID,
		OperationID:             operation.ID,
		WebhookUrl:              fields["webhook_url"],
		WebhookAccessToken:      fields["webhook_access_token"],
	})
	if err != nil {
		http.Error(w, "Failed to create subscription: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Start the listener for the new subscription
	err = postgresClient.SetupNotifications(dbClient)
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
