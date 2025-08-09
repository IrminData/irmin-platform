package middlewares

import (
	"irmin-api/utils"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// AuthMiddleware handles the user authentication for the API, tokens and user details syncing with Clerk.
func (api *APIMiddlewares) AuthMiddleware(c fiber.Ctx) error {
	// Get the locale from the context
	locale, localeOk := c.Locals("locale").(string)
	if !localeOk {
		locale = "en"
	}

	// Parse the Authorization header
	headers, err := utils.ParseHeaders(c, []string{"Authorization"}, nil)
	if err != nil {
		api.Logger.Error("Error parsing headers", "error", err)
		return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{})
	}

	token := strings.TrimPrefix(headers["Authorization"], "Bearer ")
	if token == "" {
		api.Logger.Error("No token provided")
		return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{})
	}

	// Identify the user from the token
	irminUser, isSystem, err := api.Services.IdentifyUserFromToken(c, token, locale)
	if err != nil {
		api.Logger.Error("Authentication failed", "error", err)
		return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{})
	}

	// Set the user in the context for subsequent handlers
	c.Locals("is_system", isSystem)
	if !isSystem && irminUser != nil {
		c.Locals("user", irminUser)
	}

	return c.Next()
}
