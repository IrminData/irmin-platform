// Package linearcontrollers wires the Linear connector's HTTP
// handlers. The Controllers struct embeds *common.OAuthConnector so
// every method inherits the shared OAuth machinery (token
// resolution, sentinel-to-HTTP mapping, /info OAuth-config stamping)
// alongside *common.Controllers for the per-connector base routes.
package linearcontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/linear/config"
	"irmin-connectors/models"
)

// Controllers holds the dependencies for every Linear handler. The
// composition mirrors the README example for OAuth-backed connectors:
// embed common.Controllers for the base machinery (DB, App, Logger,
// HandleConfigFields/HandleConfigValidation), and embed
// common.OAuthConnector to pick up token resolution + /info OAuth
// stamping.
type Controllers struct {
	*common.Controllers
	*common.OAuthConnector
}

// NewControllers wires the Linear controller from the connector app.
// NewOAuthConnector reads IRMIN_API_BASE_URL + IRMIN_API_TOKEN from
// the app's environment to build the underlying OAuthTokenClient,
// and pulls the connector's static OAuth config off
// config.GetConnectorInfo so the Connect button renders without a
// separate metadata fetch on the frontend.
func NewControllers(app *models.ConnectorsApp) *Controllers {
	return &Controllers{
		Controllers:    common.NewControllers(app),
		OAuthConnector: common.NewOAuthConnector(app, config.GetConnectorInfo().ConnectionOAuthConfig),
	}
}
