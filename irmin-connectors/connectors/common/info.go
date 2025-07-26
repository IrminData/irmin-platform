package common

import (
	"irmin-connectors/models"

	"github.com/gofiber/fiber/v3"
)

// RenderConnectorInfo handles the common logic for connector info endpoints.
// It retrieves connector information, prefixes URLs with the base URL, and returns the JSON response.
func RenderConnectorInfo(
	c fiber.Ctx,
	app *models.ConnectorsApp,
	getConnectorInfo func() models.ConnectorDetails,
) error {
	// Retrieve the base URL from the environment
	baseURL := app.Env.URL

	// Get the connector info from config
	info := getConnectorInfo()

	// Update URLs by prepending the base URL
	info.LogoURL = baseURL + info.LogoURL
	info.APIBaseURL = baseURL + info.APIBaseURL
	info.ReadMoreURL = baseURL + info.ReadMoreURL

	// Send the connector details
	return c.Status(fiber.StatusOK).JSON(info)
}
