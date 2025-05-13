package postgrescontrollers

import (
	postgresclient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/db"
	"irmin-connectors/utils"

	"github.com/gofiber/fiber/v3"
)

// SubscribeToChanges subscribes to changes for a given operation.
func (cs *Controllers) SubscribeToChanges(c fiber.Ctx) error {
	// get the connector registration and operation from the context
	regValue := c.Locals("registration")
	registration, ok := regValue.(*db.ConnectorRegistration)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid registration type in context",
		})
	}

	opValue := c.Locals("operation")
	operation, ok := opValue.(*db.Operation)
	if !ok {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid operation type in context",
		})
	}

	// Prepare a context for database operations
	ctx := c.Context()

	// Initialise the Postgres client
	dbClient, database, err := postgresclient.InitPostgresClient(ctx, cs.Logger, operation)
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

	// Start the listener for the new subscription
	err = postgresclient.SetupNotifications(dbClient)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to setup notifications: " + err.Error(),
		})
	}

	// Send success response
	return c.Status(fiber.StatusOK).JSON(subscription)
}
