package postgresconnector

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/postgres/config"
	postgrescontrollers "irmin-connectors/connectors/postgres/controllers"
	"irmin-connectors/models"
)

// SetupRoutes sets up the routes for the PostgreSQL connector.
func SetupRoutes(app *models.ConnectorsApp) {
	// Create a new controller instance with the database dependency
	controller := postgrescontrollers.NewControllers(app)

	// Setup routes using the common function based on connector capabilities
	common.SetupConnectorRoutes(common.ConnectorRouteConfig{
		App:           app,
		Controller:    controller,
		ConnectorSlug: "postgres",
		Capabilities:  common.GetConnectorCapabilitiesFromConfig(config.GetConnectorInfo),
	})
}
