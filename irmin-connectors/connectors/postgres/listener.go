package postgresConnector

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	postgresClient "irmin-connectors/connectors/postgres/client"
	postgresModels "irmin-connectors/connectors/postgres/models"
	"irmin-connectors/db"
	"irmin-connectors/utils"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/IrminData/irmin-sdk-go/models"
)

func StartListener(subscription db.Subscription, ctx context.Context) error {
	// Get the connection details and settings from the subscription
	var details postgresModels.ConnectionDetails
	var settings postgresModels.ConnectionSettings
	if err := json.Unmarshal([]byte(subscription.ConnectionDetails), &details); err != nil {
		return fmt.Errorf("failed to unmarshal connection details: %v", err)
	}
	if err := json.Unmarshal([]byte(subscription.ConnectionSettings), &settings); err != nil {
		return fmt.Errorf("failed to unmarshal connection settings: %v", err)
	}

	// Convert port from string to int
	port, err := strconv.Atoi(details.Port)
	if err != nil {
		return fmt.Errorf("failed to convert port to integer: %v", err)
	}

	// Establish a connection to the PostgreSQL server
	pgClient, err := postgresClient.NewPostgresClient(details.Host, port, details.User, details.Password, details.DefaultDB, details.SSLMode == "true")
	if err != nil {
		return fmt.Errorf("failed to create Postgres client: %v", err)
	}
	defer pgClient.Close() // Close the client at the end of the function

	// Connect to the specified database
	dbClient, err := pgClient.WithDatabase(settings.Database)
	if err != nil {
		pgClient.Close() // Close the initial client before returning
		return fmt.Errorf("failed to connect to database: %v", err)
	}
	defer dbClient.Close() // Close the database client at the end of the function

	// Setup the notification triggers for the database
	if err := postgresClient.SetupNotifications(dbClient); err != nil {
		return fmt.Errorf("failed to setup notifications: %v", err)
	}

	// Start the notification listener
	err = dbClient.StartNotificationListener(ctx, "data_change", func(payload string) {
		// Parse the JSON
		var evt struct {
			Operation string      `json:"operation"`
			Table     string      `json:"table"`
			ID        interface{} `json:"id"`
		}
		if err := json.Unmarshal([]byte(payload), &evt); err != nil {
			fmt.Println("Invalid payload:", err)
			return
		}

		// Log the event
		log.Printf("Received event: %s on table %s with ID %v", evt.Operation, evt.Table, evt.ID)

		// Get the row identifier as a string
		idStr := fmt.Sprintf("%v", evt.ID)

		// Construct the path for the event
		path := utils.ConstructPath(settings.Database, evt.Table, idStr, "")

		// Get the current time
		now := time.Now()

		// Convert to milliseconds since Unix epoch
		timestampMillis := now.UnixMilli()

		// Create the payload for the webhook
		data := models.ConnectorEvent{
			// Type of the event (e.g. "create", "update", "delete")
			Type: strings.ToLower(evt.Operation),
			// Irmin path of the event (e.g. /maindb/users.json/1/name)
			Path: path,
			// Timestamp of the event in milliseconds since the Unix epoch
			Timestamp: timestampMillis,
		}
		dataBytes, _ := json.Marshal(data)

		// Forward the event to the webhook specified in the subscription
		req, _ := http.NewRequest(http.MethodPost, subscription.WebhookUrl, bytes.NewReader(dataBytes))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", subscription.WebhookAccessToken)

		// Make the request. Consider timeouts, retries, error handling.
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			fmt.Printf("Error posting to %s: %v\n", subscription.WebhookUrl, err)
		}
		resp.Body.Close()
	})
	if err != nil {
		log.Fatalf("Could not start listener: %v", err)
	}

	return nil
}
