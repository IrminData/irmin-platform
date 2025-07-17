package sftpcontrollers

import (
	"github.com/gofiber/fiber/v3"
)

// DetailsPage returns public information about the SFTP connector.
func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"connector_name": "SFTP",
		"display_name":   "SFTP File Transfer",
		"description":    "Secure File Transfer Protocol connector for transferring files to and from SFTP servers",
		"documentation":  "https://docs.irmin.dev/connectors/sftp",
		"capabilities": fiber.Map{
			"operations": []string{"pull", "push"},
			"real_time":  false, // SFTP doesn't support subscriptions
			"file_types": []string{"text", "binary", "archive"},
		},
		"authentication": fiber.Map{
			"methods": []string{"password", "ssh_key"},
			"secure":  true,
		},
		"configuration": fiber.Map{
			"required_fields": []string{"host", "username"},
			"optional_fields": []string{"port", "remote_path", "file_patterns"},
		},
	})
}
