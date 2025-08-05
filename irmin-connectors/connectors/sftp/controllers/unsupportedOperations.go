package sftpcontrollers

import (
	"irmin-connectors/connectors/common"

	"github.com/gofiber/fiber/v3"
)

// OperationPatch godoc
// @Summary Patch operation (not supported)
// @Description SFTP connector does not support patch operations as SFTP files are replaced entirely rather than patched with JSON updates
// @Tags sftp
// @Security OperationTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param patch formData file true "Patch file (not supported for SFTP)"
// @Success 501 {object} fiber.Map "Not implemented - SFTP does not support patch operations"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Router /sftp/operation/patch [post]
func (cs *Controllers) OperationPatch(c fiber.Ctx) error {
	return common.HandleNotSupportedPatch(c)
}

// SubscribeToChanges godoc
// @Summary Subscribe to changes (not supported)
// @Description SFTP connector does not support real-time subscriptions as SFTP is a file transfer protocol without webhook capabilities
// @Tags sftp
// @Security OperationTokenAuth
// @Accept json
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param webhook formData string true "Webhook URL (not supported for SFTP)"
// @Success 501 {object} fiber.Map "Not implemented - SFTP does not support subscriptions"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Router /sftp/operation/subscribe [post]
func (cs *Controllers) SubscribeToChanges(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "SFTP connector does not support real-time subscriptions. SFTP is a file transfer protocol without webhook capabilities.",
	})
}
