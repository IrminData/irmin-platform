package sftpcontrollers

import (
	"irmin-connectors/connectors/common"

	"github.com/gofiber/fiber/v3"
)

// OperationPatch returns an error indicating that SFTP doesn't support patch operations.
// SFTP files are replaced entirely rather than patched with JSON updates.
func (cs *Controllers) OperationPatch(c fiber.Ctx) error {
	return common.HandleNotSupportedPatch(c)
}

// SubscribeToChanges returns an error indicating that SFTP doesn't support subscriptions.
// SFTP is a file transfer protocol and doesn't support real-time change notifications.
func (cs *Controllers) SubscribeToChanges(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "SFTP connector does not support real-time subscriptions. SFTP is a file transfer protocol without webhook capabilities.",
	})
}
