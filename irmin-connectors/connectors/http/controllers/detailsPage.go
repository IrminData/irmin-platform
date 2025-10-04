package httpcontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/http/config"

	"github.com/gofiber/fiber/v3"
)

// DetailsPage godoc
// @Summary Get HTTP connector details page
// @Description Get an HTML page with detailed information about the HTTP connector including capabilities, authentication methods, and usage examples
// @Tags http
// @Accept json
// @Produce text/html
// @Success 200 {string} string "HTTP connector details page"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /http/details [get]
func (cs *Controllers) DetailsPage(c fiber.Ctx) error {
	return common.RenderConnectorDetailsPage(
		c,
		"http",
		config.GetConnectorInfo,
		"The HTTP connector allows you to connect to any HTTP endpoint. For pull operations, it makes a request to the configured URL and returns the response as a file. For push operations, it sends the provided file content as the request body to the configured endpoint.",
	)
}
