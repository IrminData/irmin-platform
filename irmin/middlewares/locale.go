package middlewares

import (
	"github.com/gofiber/fiber/v3"
)

// LocaleMiddleware sets the dictionary and locale for the request.
func (api *APIMiddlewares) LocaleMiddleware(c fiber.Ctx) error {
	// Get the dictionary for the request's language.
	dict, locale := api.lm.GetDictionary(c)

	// Set the dictionary in the context for subsequent handlers.
	c.Locals("dict", dict)
	c.Locals("locale", locale)

	return c.Next()
}
