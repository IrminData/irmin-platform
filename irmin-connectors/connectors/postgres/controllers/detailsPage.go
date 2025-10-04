package postgrescontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/postgres/config"

	"github.com/gofiber/fiber/v3"
)

// DetailsPage godoc
// @Summary Get PostgreSQL connector details page
// @Description Get an HTML page with detailed information about the PostgreSQL connector including capabilities, authentication methods, and usage examples
// @Tags postgres
// @Accept json
// @Produce text/html
// @Success 200 {string} string "PostgreSQL connector details page"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /postgres/details [get]
func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	return common.RenderConnectorDetailsPage(
		c,
		cs.App,
		"postgres",
		config.GetConnectorInfo,
		"The connector sets up notification triggers on all tables. These triggers broadcast changes (inserts, updates, deletes) which are then captured by an event listener. The listener processes these notifications and can forward them via webhook endpoints, enabling real-time reactive workflows.",
	)
}
