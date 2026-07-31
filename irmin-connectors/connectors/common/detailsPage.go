package common

import (
	"fmt"
	"irmin-connectors/models"
	"irmin-connectors/templates"
	"irmin-connectors/utils"
	"slices"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// DetailsPageConfig holds configuration for rendering a connector details page.
type DetailsPageConfig struct {
	ConnectorSlug             string
	ConnectorInfo             models.ConnectorDetails
	EventListeningDescription string // Custom description for event listening capabilities
}

// RenderDetailsPage handles the common logic for rendering connector details pages.
func RenderDetailsPage(c fiber.Ctx, config DetailsPageConfig) error {
	// Initialize template manager
	templateManager := templates.NewConnectorTemplateManager()

	// Load the connector template
	template, err := templateManager.LoadTemplate(config.ConnectorSlug)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Error loading template")
	}

	// Build template data from connector info
	data := buildTemplateDataFromConnectorInfo(config)

	// Render the template
	htmlContent, err := template.RenderHTML(data)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Error rendering template")
	}

	c.Set("Content-Type", "text/html")
	return c.Status(fiber.StatusOK).SendString(htmlContent)
}

// buildTemplateDataFromConnectorInfo creates template data from connector configuration.
func buildTemplateDataFromConnectorInfo(config DetailsPageConfig) templates.ConnectorDetailsData {
	info := config.ConnectorInfo

	return templates.ConnectorDetailsData{
		Title:                     fmt.Sprintf("IRMIN %s Connector - Details", info.Name),
		Description:               info.Description,
		LogoPath:                  info.LogoURL,
		LogoAlt:                   fmt.Sprintf("%s Logo", info.Name),
		EventListeningDescription: getEventListeningDescription(config),
		DocsPath:                  fmt.Sprintf("/%s/docs", config.ConnectorSlug),
	}
}

// getEventListeningDescription returns the event listening description based on capabilities.
func getEventListeningDescription(config DetailsPageConfig) string {
	// If custom description is provided, use it
	if config.EventListeningDescription != "" {
		return config.EventListeningDescription
	}

	// Generate default description based on capabilities
	capabilities := config.ConnectorInfo.Capabilities
	hasWebhook := containsCapability(capabilities, irminmodels.ConnectorCapabilityPatchEvent)

	if hasWebhook {
		return fmt.Sprintf(
			"The %s connector supports real-time change notifications through webhook events, enabling reactive workflows and immediate data synchronization.",
			config.ConnectorInfo.Name,
		)
	}

	return fmt.Sprintf(
		"The %s connector provides reliable data transfer capabilities for import and export operations.",
		config.ConnectorInfo.Name,
	)
}

// containsCapability checks if a capability exists in the capabilities slice.
func containsCapability(capabilities []irminmodels.ConnectorCapability, target irminmodels.ConnectorCapability) bool {
	return slices.Contains(capabilities, target)
}

// RenderConnectorDetailsPage is a helper function for connectors to easily render their details page.
func RenderConnectorDetailsPage(
	c fiber.Ctx,
	app *models.ConnectorsApp,
	connectorSlug string,
	getConnectorInfo func() models.ConnectorDetails,
	eventDescription ...string,
) error {
	// Retrieve the base URL from the environment
	baseURL := app.Env.URL

	// Get the connector info from config
	info := getConnectorInfo()

	// Update URLs by properly joining with the base URL
	info.LogoURL = utils.JoinURL(baseURL, info.LogoURL)
	info.APIBaseURL = utils.JoinURL(baseURL, info.APIBaseURL)
	info.ReadMoreURL = utils.JoinURL(baseURL, info.ReadMoreURL)

	config := DetailsPageConfig{
		ConnectorSlug: connectorSlug,
		ConnectorInfo: info,
	}

	// Use custom event description if provided
	if len(eventDescription) > 0 {
		config.EventListeningDescription = eventDescription[0]
	}

	return RenderDetailsPage(c, config)
}
