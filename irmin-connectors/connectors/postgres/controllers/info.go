package postgrescontrollers

import (
	"irmin-connectors/connectors/postgres/config"
	"irmin-connectors/lib"

	"github.com/gofiber/fiber/v3"
)

// Info handles the /info endpoint for the PostgreSQL connector.
func (cs *Controllers) Info(c fiber.Ctx) error {
	// Retrieve the base URL from the environment
	baseURL := cs.App.Env.URL

	// Get the connector info from config
	info := config.GetConnectorInfo()
	info.LogoURL = baseURL + info.LogoURL
	info.APIBaseURL = baseURL + info.APIBaseURL
	info.ReadMoreURL = baseURL + info.ReadMoreURL

	// Make sure the request is authorized by validating the system token
	if !lib.ValidateConnectorSystemToken(cs.DB, cs.Logger, c, info.Name) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Unauthorized",
		})
	}

	// Send the connector details
	return c.Status(fiber.StatusOK).JSON(info)
}
