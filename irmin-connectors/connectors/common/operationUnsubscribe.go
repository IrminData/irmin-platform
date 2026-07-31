package common

import (
	"irmin-connectors/db"
	"irmin-connectors/models"
	"irmin-connectors/utils"
	"strconv"

	"github.com/gofiber/fiber/v3"
)

// UnsubscribeProvider defines the interface for handling subscription unsubscription.
type UnsubscribeProvider interface {
	// StopListener stops the listener for the given subscription ID.
	// Returns nil if no listener management is needed or if the listener was stopped successfully.
	StopListener(subscriptionID uint) error
}

// HandleUnsubscribeFromChanges provides common logic for unsubscribing from database changes.
// It validates the request, verifies subscription ownership, stops any active listeners,
// and deletes the subscription from the database.
func (cs *Controllers) HandleUnsubscribeFromChanges(
	c fiber.Ctx,
	provider UnsubscribeProvider,
) error {
	// Get the operation from context for ownership verification
	operation, operationOk := c.Locals("operation").(*db.Operation)
	if !operationOk {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Invalid operation type in context",
		})
	}

	// Get required fields from the request
	fields, err := utils.ParseFormFields(c, []string{"subscription_id"}, nil)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Parse subscription ID
	subscriptionID, err := strconv.ParseUint(fields["subscription_id"], 10, 64)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid subscription_id: must be a valid integer",
		})
	}

	// Check if subscription exists
	subscription, err := cs.DB.GetSubscriptionByID(uint(subscriptionID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Subscription not found",
		})
	}

	// Verify subscription ownership - ensure the subscription belongs to this operation
	if subscription.OperationID != operation.ID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Subscription does not belong to this operation",
		})
	}

	// Stop the listener if provider implements it
	if provider != nil {
		if listenerErr := provider.StopListener(subscription.ID); listenerErr != nil {
			cs.Logger.Warn("Listener was not running or already stopped",
				"subscription_id", subscription.ID,
				"error", listenerErr)
		}
	}

	// Delete the subscription from the database
	if deleteErr := cs.DB.DeleteSubscriptionByID(subscription.ID); deleteErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to delete subscription: " + deleteErr.Error(),
		})
	}

	cs.Logger.Info("Subscription removed successfully",
		"subscription_id", subscription.ID)

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message":         "Subscription removed successfully",
		"subscription_id": subscription.ID,
	})
}

// ListenerManagerUnsubscribeProvider implements UnsubscribeProvider using a ListenerManager.
type ListenerManagerUnsubscribeProvider struct {
	App *models.ConnectorsApp
}

// StopListener implements UnsubscribeProvider by delegating to the ListenerManager.
func (p *ListenerManagerUnsubscribeProvider) StopListener(subscriptionID uint) error {
	if p.App.ListenerManager != nil {
		return p.App.ListenerManager.StopListenerAsync(subscriptionID)
	}
	return nil
}
