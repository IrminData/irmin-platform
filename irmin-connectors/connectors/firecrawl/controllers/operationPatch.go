package firecrawlcontrollers

import (
	"github.com/gofiber/fiber/v3"
)

// OperationPatch godoc
// @Summary Firecrawl connector does not support patch operations
// @Description Firecrawl connector does not support patch operations - it is read-only
// @Tags firecrawl
// @Security OperationTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Success 501 {object} fiber.Map "Not implemented - Firecrawl connector does not support patch operations"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Router /firecrawl/operation/patch [post]
func (cs *Controllers) OperationPatch(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "This connector does not support patch operations. Firecrawl is read-only.",
	})
}
