package postgrescontrollers

import (
	"context"
	"encoding/json"
	postgresclient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/connectors/postgres/config"
	"irmin-connectors/db"
	"irmin-connectors/lib"
	"irmin-connectors/utils"
	"net/http"
)

func (c *Controller) SubscribeToChanges(w http.ResponseWriter, r *http.Request) {
	// Make sure the request is authorized by validating the operation token
	info := config.GetConnectorInfo()
	tokenValid, registration, operation := lib.ValidateOperationToken(c.DB, c.Logger, info.Name, w, r)
	if !tokenValid {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse the form data (including file uploads)
	if err := r.ParseMultipartForm(utils.DefaultMultipartFormMemory); err != nil {
		http.Error(w, "Invalid form data: "+err.Error(), http.StatusBadRequest)
		return
	}

	// Prepare a context for database operations
	ctx := context.Background()

	// Initialise the Postgres client
	dbClient, database, err := postgresclient.InitPostgresClient(ctx, c.Logger, operation)
	if err != nil || database == nil || dbClient == nil {
		http.Error(w, "Failed to initialise Postgres client: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer dbClient.Close()

	// Get required fields from the request
	fields, err := utils.ParseFormFields(r, []string{"webhook_url", "webhook_access_token"}, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Create a new subscription record in the database
	subscription, err := c.DB.CreateSubscription(&db.Subscription{
		ConnectorRegistrationID: registration.ID,
		OperationID:             operation.ID,
		WebhookURL:              fields["webhook_url"],
		WebhookAccessToken:      fields["webhook_access_token"],
	})
	if err != nil {
		http.Error(w, "Failed to create subscription: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Start the listener for the new subscription
	err = postgresclient.SetupNotifications(dbClient)
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
	if _, writeErr := w.Write(subscriptionJSON); writeErr != nil {
		http.Error(w, "Failed to write response: "+writeErr.Error(), http.StatusInternalServerError)
		return
	}
}
