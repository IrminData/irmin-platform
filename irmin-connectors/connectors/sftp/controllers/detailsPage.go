package sftpcontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/sftp/config"

	"github.com/gofiber/fiber/v3"
)

// DetailsPage serves static HTML content with additional information about the SFTP connector.
func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	return common.RenderConnectorDetailsPage(
		c,
		"sftp",
		config.GetConnectorInfo,
		"The connector supports both password-based authentication and SSH key-based authentication for secure access to SFTP servers.",
	)
}
