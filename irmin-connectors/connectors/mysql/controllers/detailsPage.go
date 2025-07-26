package mysqlcontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/mysql/config"

	"github.com/gofiber/fiber/v3"
)

// DetailsPage serves static HTML content with additional information about the MySQL connector.
func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	return common.RenderConnectorDetailsPage(
		c,
		"mysql",
		config.GetConnectorInfo,
		"The connector can monitor MySQL binary logs for real-time change detection. This enables capture of inserts, updates, and deletes which can be forwarded via webhook endpoints for reactive workflows.",
	)
}
