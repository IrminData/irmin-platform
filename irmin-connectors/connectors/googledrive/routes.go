// Package googledriveconnector wires the Google Drive connector's
// controllers into the shared HTTP router. Call SetupRoutes once at
// startup; every request flows through common.SetupConnectorRoutes
// from there.
package googledriveconnector

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/googledrive/config"
	googledrivecontrollers "irmin-connectors/connectors/googledrive/controllers"
	"irmin-connectors/models"
)

// SetupRoutes mounts the Google Drive connector under /googledrive.
// The controller embeds *common.OAuthConnector so every operation
// inherits the OAuth machinery without per-route wiring.
func SetupRoutes(app *models.ConnectorsApp) {
	controller := googledrivecontrollers.NewControllers(app)
	common.SetupConnectorRoutes(common.ConnectorRouteConfig{
		App:           app,
		Controller:    controller,
		ConnectorSlug: "googledrive",
		Capabilities:  common.GetConnectorCapabilitiesFromConfig(config.GetConnectorInfo),
	})
}
