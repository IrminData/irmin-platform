package common

import (
	"irmin-connectors/models"
	"irmin-connectors/utils"

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

	// Update URLs by properly joining with the base URL
	info.LogoURL = utils.JoinURL(baseURL, info.LogoURL)
	info.APIBaseURL = utils.JoinURL(baseURL, info.APIBaseURL)
	info.ReadMoreURL = utils.JoinURL(baseURL, info.ReadMoreURL)

	// Send the connector details
	return c.Status(fiber.StatusOK).JSON(info)
}
