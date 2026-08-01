package swagger

import (
	"irmin-connectors/templates"

	"github.com/gofiber/fiber/v3"
)

// JSON godoc
// @Summary Get Swagger JSON specification
// @Description Retrieve the OpenAPI 3.0 specification in JSON format for this API
// @Tags documentation
// @Accept json
// @Produce json
// @Success 200 {object} object "OpenAPI 3.0 specification in JSON format"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Swagger specification file not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /swagger.json [get]
func JSON(c fiber.Ctx) error {
	return c.SendFile("./docs/swagger.json")
}

// UI godoc
// @Summary Swagger UI interface
// @Description Interactive API documentation interface using Swagger UI
// @Tags documentation
// @Accept json
// @Produce text/html
// @Success 200 {string} string "Swagger UI HTML page"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /swagger [get]
func UI(c fiber.Ctx) error {
	return c.Type("html").Send(templates.SwaggerUIHTML)
}
