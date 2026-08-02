package firecrawlcontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/firecrawl/config"

	"github.com/gofiber/fiber/v3"
)

// Info godoc
// @Summary Get Firecrawl connector information
// @Description Get detailed information about the Firecrawl connector including capabilities, configuration fields, and API endpoints
// @Tags firecrawl
// @Security SystemTokenAuth
// @Accept json
// @Produce json
// @Success 200 {object} models.ConnectorDetails "Firecrawl connector information retrieved successfully"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /firecrawl/info [get]
func (cs *Controllers) Info(c fiber.Ctx) error {
	return common.RenderConnectorInfo(c, cs.App, config.GetConnectorInfo)
}
