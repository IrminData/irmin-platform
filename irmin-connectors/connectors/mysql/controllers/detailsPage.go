package mysqlcontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/mysql/config"

	"github.com/gofiber/fiber/v3"
)

// DetailsPage godoc
// @Summary Get MySQL connector details page
// @Description Get an HTML page with detailed information about the MySQL connector including capabilities, authentication methods, and usage examples
// @Tags mysql
// @Accept json
// @Produce text/html
// @Success 200 {string} string "MySQL connector details page"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /mysql/details [get]
func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	return common.RenderConnectorDetailsPage(
		c,
		cs.App,
		"mysql",
		config.GetConnectorInfo,
		"The connector can monitor MySQL binary logs for real-time change detection. This enables capture of inserts, updates, and deletes which can be forwarded via webhook endpoints for reactive workflows.",
	)
}
