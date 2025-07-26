package sftpcontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/sftp/config"

	"github.com/gofiber/fiber/v3"
)

// ValidateSystemTokenMiddleware validates the system token for SFTP connector endpoints.
func (cs *Controllers) ValidateSystemTokenMiddleware(c fiber.Ctx) error {
	return common.ValidateSystemToken(c, cs.App, config.GetConnectorInfo)
}

// ValidateOperationTokenMiddleware validates the operation token for SFTP data operations.
func (cs *Controllers) ValidateOperationTokenMiddleware(c fiber.Ctx) error {
	return common.ValidateOperationToken(c, cs.App, config.GetConnectorInfo)
}
