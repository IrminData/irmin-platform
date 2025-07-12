package mysqlcontrollers

import (
	mysqlclient "irmin-connectors/connectors/mysql/client"
	"irmin-connectors/db"
	"irmin-connectors/utils"

	"github.com/gofiber/fiber/v3"
)

// SubscribeToChanges subscribes to changes for a given operation.
func (cs *Controllers) SubscribeToChanges(c fiber.Ctx) error {
	// Get the connector registration and operation from the context
	registration, registrationOk := c.Locals("registration").(*db.ConnectorRegistration)
	operation, operationOk := c.Locals("operation").(*db.Operation)
	if !registrationOk || !operationOk {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid registration or operation type in context",
		})
	}

	// Prepare a context for database operations
	ctx := c.Context()

	// Initialise the MySQL client
	dbClient, database, err := mysqlclient.InitMySQLClient(ctx, cs.Logger, operation)
	if err != nil || database == nil || dbClient == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialise MySQL client: " + err.Error(),
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

	// Set up change tracking triggers
	err = mysqlclient.SetupChangeTracking(dbClient)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to setup change tracking: " + err.Error(),
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

	// Send success response
	return c.Status(fiber.StatusOK).JSON(subscription)
}
