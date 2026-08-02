package firecrawlcontrollers

import (
	"irmin-connectors/templates"

	"github.com/gofiber/fiber/v3"
)

// DetailsPage godoc
// @Summary Get Firecrawl connector details page
// @Description Returns an HTML page with information about the Firecrawl connector
// @Tags firecrawl
// @Produce html
// @Success 200 {string} string "HTML page with connector details"
// @Failure 500 {string} string "Internal server error"
// @Router /firecrawl/details [get]
func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	templateManager := templates.NewConnectorTemplateManager()
	template, err := templateManager.LoadTemplate("firecrawl")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Error loading template: " + err.Error())
	}

	data := templates.ConnectorDetailsData{
		Title:                     "IRMIN Firecrawl Connector - Details",
		Description:               "The Firecrawl connector enables web scraping and crawling powered by the Firecrawl API. Convert entire websites into clean markdown, HTML, or structured JSON data for use in your data pipelines and AI applications.",
		LogoPath:                  "/public/firecrawl.png",
		LogoAlt:                   "Firecrawl Logo",
		EventListeningDescription: "This connector does not support real-time event listening. Data is retrieved on-demand through pull operations.",
		DocsPath:                  "/firecrawl/docs",
	}

	htmlContent, err := template.RenderHTML(data)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Error rendering template: " + err.Error())
	}

	c.Set("Content-Type", "text/html")
	return c.Status(fiber.StatusOK).SendString(htmlContent)
}
