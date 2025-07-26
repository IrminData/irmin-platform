package mysqlcontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/mysql/config"

	"github.com/gofiber/fiber/v3"
)

// Info handles the /info endpoint for the MySQL connector.
func (cs *Controllers) Info(c fiber.Ctx) error {
	return common.RenderConnectorInfo(c, cs.App, config.GetConnectorInfo)
}
