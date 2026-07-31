package sftpconnector

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/sftp/config"
	sftpcontrollers "irmin-connectors/connectors/sftp/controllers"
	"irmin-connectors/models"
)

// SetupRoutes sets up the routes for the SFTP connector.
func SetupRoutes(app *models.ConnectorsApp) {
	// Create a new controller instance with the database dependency
	controller := sftpcontrollers.NewControllers(app)

	// Setup routes using the common function based on connector capabilities
	common.SetupConnectorRoutes(common.ConnectorRouteConfig{
		App:           app,
		Controller:    controller,
		ConnectorSlug: "sftp",
		Capabilities:  common.GetConnectorCapabilitiesFromConfig(config.GetConnectorInfo),
	})
}
