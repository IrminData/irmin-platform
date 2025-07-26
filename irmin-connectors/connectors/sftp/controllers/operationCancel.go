package sftpcontrollers

import (
	"irmin-connectors/connectors/common"

	"github.com/gofiber/fiber/v3"
)

// OperationCancel cancels ongoing SFTP file transfer operations.
func (cs *Controllers) OperationCancel(c fiber.Ctx) error {
	return common.CancelOperation(c, cs.App, common.LogOnlyCancellation)
}
