package middlewares

import (
	"context"
	"irmin-api/locales"
	"irmin-api/services"
	"strings"

	"github.com/gofiber/fiber/v3"
)

// AuthMiddleware handles the user authentication for the API, tokens and user details syncing with Clerk.
func (api *APIMiddlewares) AuthMiddleware(c fiber.Ctx) error {
	// Get the locale and dictionary from the context
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	if !localeOk {
		locale = "en"
	}
	if !dictOk {
		dict, locale = api.lm.GetDictionary(c)
	}

	// Get the Authorization header
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return api.handleServiceError(
			c,
			"No authorization header provided",
			services.ErrInvalidRequest,
			dict,
		)
	}

	token := strings.TrimPrefix(authHeader, "Bearer ")
	if token == "" || token == authHeader {
		return api.handleServiceError(
			c,
			"Invalid authorization header format",
			services.ErrInvalidRequest,
			dict,
		)
	}

	// Identify the user from the token
	// Use context.Background() instead of Fiber context to ensure timeouts work properly
	irminUser, isSystem, err := api.Services.IdentifyUserFromToken(context.Background(), token, locale)
	if err != nil {
		return api.handleServiceError(c, "Authentication failed", err, dict)
	}

	// Set the user in the context for subsequent handlers
	c.Locals("is_system", isSystem)
	if !isSystem && irminUser != nil {
		c.Locals("user", irminUser)
		// Set the user's authentication token in the context
		c.Locals("user_token", &token)
	}

	return c.Next()
}
