// Package stripecontrollers holds the HTTP handlers for every
// connector endpoint. One file per operation, mirroring the pattern
// used by pinecone/ and firecrawl/. The Controllers struct embeds
// *common.Controllers so every method inherits the shared
// HandleConfigFields / HandleOperationInit machinery.
package stripecontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/models"
)

// Controllers holds the dependencies for the Stripe connector controllers.
// Single struct — no OAuth helpers to embed since Stripe ships with
// API-key auth.
type Controllers struct {
	*common.Controllers
}

// NewControllers creates a new instance of controllers with the required dependencies.
func NewControllers(app *models.ConnectorsApp) *Controllers {
	return &Controllers{
		Controllers: common.NewControllers(app),
	}
}
