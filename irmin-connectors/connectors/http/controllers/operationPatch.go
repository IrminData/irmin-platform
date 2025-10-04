package httpcontrollers

import (
	"github.com/gofiber/fiber/v3"
)

// OperationPatch godoc
// @Summary HTTP connector does not support patch operations
// @Description HTTP connector does not support patch operations
// @Tags http
// @Security OperationTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Success 501 {object} fiber.Map "Not implemented - HTTP connector does not support patch operations"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Router /http/operation/patch [post]
func (cs *Controllers) OperationPatch(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "This connector does not support patch operations.",
	})
}
