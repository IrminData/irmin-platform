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
		"When you create a subscription in Irmin, this connector automatically sets up PostgreSQL notification triggers and starts a dedicated listener. Changes (inserts, updates, deletes) are captured in real-time using pg_notify and automatically sent to Irmin's webhook endpoint as patch operations. No manual webhook configuration is required - it's fully automatic.",
	)
}
