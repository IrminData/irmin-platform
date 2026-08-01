// Package googledrivecontrollers wires the Google Drive connector's
// HTTP handlers. The Controllers struct embeds *common.OAuthConnector so
// every method inherits the shared OAuth machinery (token resolution,
// sentinel-to-HTTP mapping, /info OAuth-config stamping) alongside
// *common.Controllers for the per-connector base routes.
//
// Google Drive is a static-client OAuth connector: an admin registers
// one OAuth app per environment in Google Cloud Console, and the
// resulting client credentials live in Core's connection_oauth_clients
// table (workspace_id = NULL, global).  No DCR.
package googledrivecontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/googledrive/config"
	"irmin-connectors/models"
)

// Controllers holds the dependencies for every Google Drive handler.
type Controllers struct {
	*common.Controllers
	*common.OAuthConnector
}

// NewControllers wires the Google Drive controller from the connector app.
func NewControllers(app *models.ConnectorsApp) *Controllers {
	return &Controllers{
		Controllers:    common.NewControllers(app),
		OAuthConnector: common.NewOAuthConnector(app, config.GetConnectorInfo().ConnectionOAuthConfig),
	}
}
