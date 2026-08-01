package httpcontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/models"
)

// Controllers holds the dependencies for the HTTP connector controllers.
//
// OAuthConnector is embedded even though HTTP is a static-credential
// connector. The base no-ops cleanly when Config is nil (Info stamping
// skips, resolver returns ErrOAuthNotConfigured), which keeps the embed
// uniform across the connector family. This is the "prove the base
// handles the non-OAuth case" step from Phase 3: HTTP reuses the shared
// scaffolding without adopting OAuth itself.
type Controllers struct {
	*common.Controllers
	*common.OAuthConnector
}

// NewControllers creates a new instance of controllers with the required dependencies.
func NewControllers(app *models.ConnectorsApp) *Controllers {
	return &Controllers{
		Controllers:    common.NewControllers(app),
		OAuthConnector: common.NewOAuthConnector(app, nil /* no OAuth for HTTP */),
	}
}
