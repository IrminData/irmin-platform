package googledrivecontrollers

import (
	"irmin-connectors/connectors/common"
	googledriveconfig "irmin-connectors/connectors/googledrive/config"

	"github.com/gofiber/fiber/v3"
)

// ValidateSystemTokenMiddleware verifies the inbound system token
// (cross-service auth from Core) and stamps the connector info on
// the request locals so EnsureOperationMiddleware can pick it up.
func (cs *Controllers) ValidateSystemTokenMiddleware(c fiber.Ctx) error {
	return common.ValidateSystemToken(c, cs.App, googledriveconfig.GetConnectorInfo)
}

// EnsureOperationMiddleware upserts the Operation row from the
// `details[]` / `settings[]` form fields the SDK's StartOperation*
// requests carry. Google Drive has no `details[]` fields (OAuth supplies
// the credential), but the middleware still runs so settings get
// captured uniformly across operations.
func (cs *Controllers) EnsureOperationMiddleware(c fiber.Ctx) error {
	return common.EnsureOperation(c, cs.App.DB, cs)
}
