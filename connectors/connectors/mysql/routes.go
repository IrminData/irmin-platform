package mysqlconnector

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/mysql/config"
	mysqlcontrollers "irmin-connectors/connectors/mysql/controllers"
	"irmin-connectors/models"
)

// SetupRoutes sets up the routes for the MySQL connector.
func SetupRoutes(app *models.ConnectorsApp) {
	// Create a new controller instance with the database dependency
	controller := mysqlcontrollers.NewControllers(app)

	// Setup routes using the common function based on connector capabilities
	common.SetupConnectorRoutes(common.ConnectorRouteConfig{
		App:           app,
		Controller:    controller,
		ConnectorSlug: "mysql",
		Capabilities:  common.GetConnectorCapabilitiesFromConfig(config.GetConnectorInfo),
	})
}
