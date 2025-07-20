package mysqlcontrollers

import (
	"irmin-connectors/templates"

	"github.com/gofiber/fiber/v3"
)

// DetailsPage serves static HTML content with additional information about the MySQL connector.
func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	// Initialize template manager
	templateManager := templates.NewConnectorTemplateManager()

	// Load the MySQL template
	template, err := templateManager.LoadTemplate("mysql")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Error loading template")
	}

	// Prepare template data
	data := templates.ConnectorDetailsData{
		Title:                     "IRMIN MySQL Connector - Details",
		Description:               "This connector uses standard MySQL connection fields such as host, port, user, password, and (optionally) the default database to establish a secure connection.",
		LogoPath:                  "/public/mysql.png",
		LogoAlt:                   "MySQL Logo",
		EventListeningDescription: "The connector can monitor MySQL binary logs for real-time change detection. This enables capture of inserts, updates, and deletes which can be forwarded via webhook endpoints for reactive workflows.",
		DocsPath:                  "/mysql/docs",
	}

	// Render the template
	htmlContent, err := template.RenderHTML(data)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Error rendering template")
	}

	c.Set("Content-Type", "text/html")
	return c.Status(fiber.StatusOK).SendString(htmlContent)
}
