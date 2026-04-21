package stripecontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/stripe/config"

	"github.com/gofiber/fiber/v3"
)

// ValidateSystemTokenMiddleware validates the system token.
func (cs *Controllers) ValidateSystemTokenMiddleware(c fiber.Ctx) error {
	return common.ValidateSystemToken(c, cs.App, config.GetConnectorInfo)
}

// ValidateOperationTokenMiddleware validates the operation token.
func (cs *Controllers) ValidateOperationTokenMiddleware(c fiber.Ctx) error {
	return common.ValidateOperationToken(c, cs.App, config.GetConnectorInfo)
}
