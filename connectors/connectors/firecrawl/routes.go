package firecrawlconnector

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/firecrawl/config"
	firecrawlcontrollers "irmin-connectors/connectors/firecrawl/controllers"
	"irmin-connectors/models"
)

// SetupRoutes sets up the routes for the Firecrawl connector.
func SetupRoutes(app *models.ConnectorsApp) {
	// Create a new controller instance with the database dependency
	controller := firecrawlcontrollers.NewControllers(app)

	// Setup routes using the common function based on connector capabilities
	common.SetupConnectorRoutes(common.ConnectorRouteConfig{
		App:           app,
		Controller:    controller,
		ConnectorSlug: "firecrawl",
		Capabilities:  common.GetConnectorCapabilitiesFromConfig(config.GetConnectorInfo),
	})
}
