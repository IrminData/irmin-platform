package sftpcontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/sftp/config"

	"github.com/gofiber/fiber/v3"
)

// Info handles the /info endpoint for the SFTP connector.
func (cs *Controllers) Info(c fiber.Ctx) error {
	return common.RenderConnectorInfo(c, cs.App, config.GetConnectorInfo)
}
