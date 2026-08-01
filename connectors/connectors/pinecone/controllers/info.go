package pineconecontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/pinecone/config"

	"github.com/gofiber/fiber/v3"
)

// Info godoc
// @Summary Get Pinecone connector information
// @Description Get detailed information about the Pinecone connector including capabilities, configuration fields, and API endpoints
// @Tags pinecone
// @Security SystemTokenAuth
// @Accept json
// @Produce json
// @Success 200 {object} models.ConnectorDetails "Pinecone connector information retrieved successfully"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /pinecone/info [get]
func (cs *Controllers) Info(c fiber.Ctx) error {
	return common.RenderConnectorInfo(c, cs.App, config.GetConnectorInfo)
}
