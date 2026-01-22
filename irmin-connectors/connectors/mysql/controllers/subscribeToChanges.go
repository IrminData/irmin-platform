package mysqlcontrollers

import (
	mysqlclient "irmin-connectors/connectors/mysql/client"
	"irmin-connectors/db"
	"irmin-connectors/utils"

	"github.com/gofiber/fiber/v3"
)

// ConnectorName is the name used to identify this connector in the listener manager.
const ConnectorName = "MySQL"

// SubscribeToChanges godoc
// @Summary Subscribe to MySQL database changes
// @Description Set up real-time monitoring of MySQL database changes using binary log tracking and webhook notifications
// @Tags mysql
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param webhook_url formData string true "Webhook URL to receive change notifications"
// @Param webhook_access_token formData string true "Access token for webhook authentication"
// @Success 200 {object} db.Subscription "Subscription created successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid parameters"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /mysql/operation/subscribe [post]
func (cs *Controllers) SubscribeToChanges(c fiber.Ctx) error {
	// Get the connector registration and operation from the context
	registration, registrationOk := c.Locals("registration").(*db.ConnectorRegistration)
	operation, operationOk := c.Locals("operation").(*db.Operation)
	if !registrationOk || !operationOk {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid registration or operation type in context",
		})
	}

	// Initialise the MySQL client
	dbClient, database, err := mysqlclient.InitMySQLClient(c, cs.Logger, operation)
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
