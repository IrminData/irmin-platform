package postgrescontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/postgres/config"

	"github.com/gofiber/fiber/v3"
)

// DetailsPage serves static HTML content with additional information about the PostgreSQL connector.
func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	return common.RenderConnectorDetailsPage(
		c,
		"postgres",
		config.GetConnectorInfo,
		"The connector sets up notification triggers on all tables. These triggers broadcast changes (inserts, updates, deletes) which are then captured by an event listener. The listener processes these notifications and can forward them via webhook endpoints, enabling real-time reactive workflows.",
	)
}
