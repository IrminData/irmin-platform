package postgrescontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/postgres/config"

	"github.com/gofiber/fiber/v3"
)

// Info handles the /info endpoint for the PostgreSQL connector.
func (cs *Controllers) Info(c fiber.Ctx) error {
	return common.RenderConnectorInfo(c, cs.App, config.GetConnectorInfo)
}
