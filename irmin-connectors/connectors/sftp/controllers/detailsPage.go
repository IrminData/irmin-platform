package sftpcontrollers

import (
	"irmin-connectors/templates"

	"github.com/gofiber/fiber/v3"
)

// DetailsPage serves static HTML content with additional information about the SFTP connector.
func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	// Initialize template manager
	templateManager := templates.NewConnectorTemplateManager()

	// Load the SFTP template
	template, err := templateManager.LoadTemplate("sftp")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Error loading template")
	}

	// Prepare template data
	data := templates.ConnectorDetailsData{
		Title:                     "IRMIN SFTP Connector - Details",
		Description:               "This connector uses standard SFTP connection fields such as host, port, username, and authentication method to establish a secure file transfer connection.",
		LogoPath:                  "/public/sftp.png",
		LogoAlt:                   "SFTP Logo",
		EventListeningDescription: "The connector supports both password-based authentication and SSH key-based authentication for secure access to SFTP servers.",
		DocsPath:                  "/sftp/docs",
	}

	// Render the template
	htmlContent, err := template.RenderHTML(data)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Error rendering template")
	}

	c.Set("Content-Type", "text/html")
	return c.Status(fiber.StatusOK).SendString(htmlContent)
}
