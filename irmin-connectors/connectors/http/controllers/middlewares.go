package httpcontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/http/config"

	"github.com/gofiber/fiber/v3"
)

// ValidateSystemTokenMiddleware validates the system token.
func (cs *Controllers) ValidateSystemTokenMiddleware(c fiber.Ctx) error {
	return common.ValidateSystemToken(c, cs.App, config.GetConnectorInfo)
}

// EnsureOperationMiddleware upserts the Operation row from the
// `details[]` / `settings[]` form fields the SDK's StartOperation*
// requests now carry. Registered as the second handler on every
// data route after ValidateSystemToken — see common/routes.go.
func (cs *Controllers) EnsureOperationMiddleware(c fiber.Ctx) error {
	return common.EnsureOperation(c, cs.App.DB, cs)
}
