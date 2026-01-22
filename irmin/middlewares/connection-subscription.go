package middlewares

import (
	"github.com/gofiber/fiber/v3"
)

// ConnectionSubscriptionMiddleware loads a connection subscription by its ID from the URL.
func (api *APIMiddlewares) ConnectionSubscriptionMiddleware(c fiber.Ctx) error {
	return resourceMiddleware(api, c, "subscription", "connection_subscriptions", api.DB.GetConnectionSubscriptionByID)
}
