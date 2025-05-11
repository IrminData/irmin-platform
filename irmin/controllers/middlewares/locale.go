package middlewares

import (
	"irmin-api/locales"

	"github.com/gofiber/fiber/v3"
)

// LocaleMiddleware sets the dictionary and locale for the request.
func LocaleMiddleware(c fiber.Ctx) error {
	// Get the dictionary for the request's language.
	dict, locale := locales.GetDictionary(c)

	// Set the dictionary in the context for subsequent handlers.
	c.Locals("dict", dict)
	c.Locals("locale", locale)

	return c.Next()
}
