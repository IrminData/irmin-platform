package googledrivecontrollers

import (
	"github.com/gofiber/fiber/v3"
)

// OperationPatch godoc
// @Summary Google Drive connector does not support patch operations
// @Description Google Drive connector does not support patch operations.
// @Tags googledrive
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Success 501 {object} fiber.Map "Not implemented - Google Drive does not support patch"
// @Failure 401 {object} fiber.Map "Unauthorized"
// @Router /googledrive/operation/patch [post]
func (cs *Controllers) OperationPatch(c fiber.Ctx) error {
	return c.Status(fiber.StatusNotImplemented).JSON(fiber.Map{
		"error": "This connector does not support patch operations.",
	})
}
