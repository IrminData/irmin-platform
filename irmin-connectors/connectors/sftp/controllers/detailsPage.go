package sftpcontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/sftp/config"

	"github.com/gofiber/fiber/v3"
)

// DetailsPage godoc
// @Summary Get SFTP connector details page
// @Description Get an HTML page with detailed information about the SFTP connector including capabilities, authentication methods, and usage examples
// @Tags sftp
// @Accept json
// @Produce text/html
// @Success 200 {string} string "SFTP connector details page"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /sftp/details [get]
func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	return common.RenderConnectorDetailsPage(
		c,
		"sftp",
		config.GetConnectorInfo,
		"The connector supports both password-based authentication and SSH key-based authentication for secure access to SFTP servers.",
	)
}
