package sftpcontrollers

import (
	"github.com/gofiber/fiber/v3"
)

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

// UnsubscribeFromChanges godoc
// @Summary Unsubscribe from changes (not supported)
// @Description SFTP connector does not support real-time subscriptions as SFTP is a file transfer protocol without webhook capabilities
// @Tags sftp
// @Security OperationTokenAuth
// @Accept json
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Param subscription_id formData string true "Subscription ID (not supported for SFTP)"
// @Success 501 {object} fiber.Map "Not implemented - SFTP does not support subscriptions"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Router /sftp/operation/unsubscribe [post]
func (cs *Controllers) UnsubscribeFromChanges(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "SFTP connector does not support real-time subscriptions. SFTP is a file transfer protocol without webhook capabilities.",
	})
}
