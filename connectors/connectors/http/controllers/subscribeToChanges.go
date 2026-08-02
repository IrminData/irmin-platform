package httpcontrollers

import (
	"github.com/gofiber/fiber/v3"
)

// SubscribeToChanges godoc
// @Summary HTTP connector does not support webhook subscriptions
// @Description HTTP connector does not support webhook subscriptions
// @Tags http
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Success 501 {object} fiber.Map "Not implemented - HTTP connector does not support webhook subscriptions"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Router /http/operation/subscribe [post]
func (cs *Controllers) SubscribeToChanges(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "This connector does not support webhook subscriptions.",
	})
}

// UnsubscribeFromChanges godoc
// @Summary HTTP connector does not support webhook subscriptions
// @Description HTTP connector does not support webhook subscriptions
// @Tags http
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param subscription_id formData string true "Subscription ID"
// @Success 501 {object} fiber.Map "Not implemented - HTTP connector does not support webhook subscriptions"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Router /http/operation/unsubscribe [post]
func (cs *Controllers) UnsubscribeFromChanges(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "This connector does not support webhook subscriptions.",
	})
}
