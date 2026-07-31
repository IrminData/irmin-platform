// Package stripeconnector wires the Stripe controllers into the
// shared HTTP router. Call SetupRoutes once at startup; everything
// else hangs off config.GetConnectorInfo.
package stripeconnector

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/stripe/config"
	stripecontrollers "irmin-connectors/connectors/stripe/controllers"
	"irmin-connectors/models"
)

// SetupRoutes sets up the routes for the Stripe connector.
func SetupRoutes(app *models.ConnectorsApp) {
	controller := stripecontrollers.NewControllers(app)
	common.SetupConnectorRoutes(common.ConnectorRouteConfig{
		App:           app,
		Controller:    controller,
		ConnectorSlug: "stripe",
		Capabilities:  common.GetConnectorCapabilitiesFromConfig(config.GetConnectorInfo),
	})
}
