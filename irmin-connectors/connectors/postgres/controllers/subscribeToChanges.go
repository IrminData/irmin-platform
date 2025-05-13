package postgrescontrollers

import (
	postgresclient "irmin-connectors/connectors/postgres/client"
	"irmin-connectors/connectors/postgres/config"
	"irmin-connectors/db"
	"irmin-connectors/lib"
	"irmin-connectors/utils"

	"github.com/gofiber/fiber/v3"
)

func (cs *Controllers) SubscribeToChanges(c fiber.Ctx) error {
	// Make sure the request is authorized by validating the operation token
	info := config.GetConnectorInfo()
	tokenValid, registration, operation := lib.ValidateOperationToken(cs.DB, cs.Logger, c, info.Name)
	if !tokenValid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
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
