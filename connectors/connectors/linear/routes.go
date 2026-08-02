// Package linearconnector wires the Linear connector's controllers
// into the shared HTTP router. Call SetupRoutes once at startup;
// every request flows through common.SetupConnectorRoutes from there.
package linearconnector

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/linear/config"
	linearcontrollers "irmin-connectors/connectors/linear/controllers"
	"irmin-connectors/models"
)

// SetupRoutes mounts the Linear connector under /linear. The
// controller embeds *common.OAuthConnector so every operation
// inherits the OAuth machinery without per-route wiring.
func SetupRoutes(app *models.ConnectorsApp) {
	controller := linearcontrollers.NewControllers(app)
	common.SetupConnectorRoutes(common.ConnectorRouteConfig{
		App:           app,
		Controller:    controller,
		ConnectorSlug: "linear",
		Capabilities:  common.GetConnectorCapabilitiesFromConfig(config.GetConnectorInfo),
	})
}
