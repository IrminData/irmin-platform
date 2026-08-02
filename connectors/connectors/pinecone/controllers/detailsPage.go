package pineconecontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/pinecone/config"

	"github.com/gofiber/fiber/v3"
)

// DetailsPage godoc
// @Summary Get Pinecone connector details page
// @Description Get an HTML page with detailed information about the Pinecone connector including capabilities, authentication methods, and usage examples
// @Tags pinecone
// @Accept json
// @Produce text/html
// @Success 200 {string} string "Pinecone connector details page"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /pinecone/details [get]
func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	return common.RenderConnectorDetailsPage(
		c,
		cs.App,
		"pinecone",
		config.GetConnectorInfo,
		"This connector allows you to export embeddings from Irmin to Pinecone and import vectors back from Pinecone. Pull operations support both semantic search (with query) and full vector export (without query).",
	)
}
