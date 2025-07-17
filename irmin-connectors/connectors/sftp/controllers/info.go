package sftpcontrollers

import (
	"irmin-connectors/connectors/sftp/config"

	"github.com/gofiber/fiber/v3"
)

// Info handles the /info endpoint for the SFTP connector.
func (cs *Controllers) Info(c fiber.Ctx) error {
	// Retrieve the base URL from the environment
	baseURL := cs.App.Env.URL

	// Get the connector info from config
	info := config.GetConnectorInfo()
	info.LogoURL = baseURL + info.LogoURL
	info.APIBaseURL = baseURL + info.APIBaseURL
	info.ReadMoreURL = baseURL + info.ReadMoreURL

	// Send the connector details
	return c.Status(fiber.StatusOK).JSON(info)
}
