package sftpcontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/sftp/config"

	"github.com/gofiber/fiber/v3"
)

// OperationStatus handles the status check of an operation using the common framework.
func (cs *Controllers) OperationStatus(c fiber.Ctx) error {
	return common.HandleOperationStatus(c, config.GetConnectorInfo, cs.App)
}
