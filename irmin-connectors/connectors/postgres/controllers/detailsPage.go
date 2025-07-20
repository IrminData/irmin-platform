package postgrescontrollers

import (
	"irmin-connectors/templates"

	"github.com/gofiber/fiber/v3"
)

// DetailsPage serves static HTML content with additional information about the PostgreSQL connector.
func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	// Initialize template manager
	templateManager := templates.NewConnectorTemplateManager()

	// Load the PostgreSQL template
	template, err := templateManager.LoadTemplate("postgres")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Error loading template")
	}

	// Prepare template data
	data := templates.ConnectorDetailsData{
		Title:                     "IRMIN PostgreSQL Connector - Details",
		Description:               "This connector uses standard PostgreSQL connection fields such as host, port, user, password, and (optionally) the default database to establish a secure connection.",
		LogoPath:                  "/public/postgres.png",
		LogoAlt:                   "PostgreSQL Logo",
		EventListeningDescription: "The connector sets up notification triggers on all tables. These triggers broadcast changes (inserts, updates, deletes) which are then captured by an event listener. The listener processes these notifications and can forward them via webhook endpoints, enabling real-time reactive workflows.",
		DocsPath:                  "/postgres/docs",
	}

	// Render the template
	htmlContent, err := template.RenderHTML(data)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Error rendering template")
	}

	c.Set("Content-Type", "text/html")
	return c.Status(fiber.StatusOK).SendString(htmlContent)
}
