package sftpcontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/sftp/config"

	"github.com/gofiber/fiber/v3"
)

// OperationStatus godoc
// @Summary Get SFTP operation status
// @Description Get the current status of an SFTP operation using the operation token
// @Tags sftp
// @Security SystemTokenAuth
// @Accept json
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Success 200 {object} common.OperationStatus "Operation status retrieved successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /sftp/operation/status [post]
func (cs *Controllers) OperationStatus(c fiber.Ctx) error {
	return common.HandleOperationStatus(c, config.GetConnectorInfo, cs.App)
}
