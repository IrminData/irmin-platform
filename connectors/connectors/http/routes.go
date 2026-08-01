package httpconnector

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/http/config"
	httpcontrollers "irmin-connectors/connectors/http/controllers"
	"irmin-connectors/models"
)

// SetupRoutes sets up the routes for the HTTP connector.
func SetupRoutes(app *models.ConnectorsApp) {
	// Create a new controller instance with the database dependency
	controller := httpcontrollers.NewControllers(app)

	// Setup routes using the common function based on connector capabilities
	common.SetupConnectorRoutes(common.ConnectorRouteConfig{
		App:           app,
		Controller:    controller,
		ConnectorSlug: "http",
		Capabilities:  common.GetConnectorCapabilitiesFromConfig(config.GetConnectorInfo),
	})
}
