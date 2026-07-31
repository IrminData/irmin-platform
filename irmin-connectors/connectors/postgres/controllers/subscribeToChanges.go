package postgrescontrollers

import (
	postgresclient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/db"
	"irmin-connectors/utils"

	"github.com/gofiber/fiber/v3"
)

// ConnectorName is the name used to identify this connector in the listener manager.
const ConnectorName = "PostgreSQL"

// SubscribeToChanges godoc
// @Summary Subscribe to PostgreSQL database changes
// @Description Set up real-time monitoring of PostgreSQL database changes using notification triggers and webhook notifications
// @Tags postgres
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param webhook_url formData string true "Webhook URL to receive change notifications"
// @Param webhook_access_token formData string true "Access token for webhook authentication"
// @Success 200 {object} db.Subscription "Subscription created successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid parameters"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /postgres/operation/subscribe [post]
func (cs *Controllers) SubscribeToChanges(c fiber.Ctx) error {
	// Get the connector registration and operation from the context
	registration, registrationOk := c.Locals("registration").(*db.ConnectorRegistration)
	operation, operationOk := c.Locals("operation").(*db.Operation)
	if !registrationOk || !operationOk {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid registration or operation type in context",
		})
	}

	// Initialise the Postgres client
	dbClient, database, err := postgresclient.InitPostgresClient(c, cs.Logger, operation)
	if err != nil || database == nil || dbClient == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialise Postgres client: " + err.Error(),
		})
	}
	defer dbClient.Close()

	// Get required fields from the request
	fields, err := utils.ParseFormFields(c, []string{"webhook_url", "webhook_access_token"}, nil)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Setup database notification triggers first
	err = postgresclient.SetupNotifications(dbClient)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to setup notifications: " + err.Error(),
		})
	}

	// Create a new subscription record in the database
	subscription, err := cs.DB.CreateSubscription(&db.Subscription{
		ConnectorRegistrationID: registration.ID,
		OperationID:             operation.ID,
		WebhookURL:              fields["webhook_url"],
		WebhookAccessToken:      fields["webhook_access_token"],
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to create subscription: " + err.Error(),
		})
	}

	// Start the listener goroutine for this subscription using the listener manager
	if cs.App.ListenerManager != nil {
		if listenerErr := cs.App.ListenerManager.StartListener(ConnectorName, *subscription); listenerErr != nil {
			cs.Logger.Error("Failed to start listener for new subscription",
				"subscription_id", subscription.ID,
				"error", listenerErr)
			// Note: We don't fail the request here - the subscription is created and
			// the listener will be started on next service restart if needed
		}
	}

	// Send success response
	return c.Status(fiber.StatusOK).JSON(subscription)
}
