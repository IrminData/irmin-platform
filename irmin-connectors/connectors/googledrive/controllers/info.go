package googledrivecontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/googledrive/config"

	"github.com/gofiber/fiber/v3"
)

// Info godoc
// @Summary Get Google Drive connector information
// @Description Returns connector metadata including capabilities, OAuth configuration, and dynamic field schema. The embedded ConnectionOAuthConfig tells the console to render a Connect-with-Google button instead of a credential form.
// @Tags googledrive
// @Security SystemTokenAuth
// @Accept json
// @Produce json
// @Success 200 {object} models.ConnectorDetails "Google Drive connector information"
// @Failure 401 {object} fiber.Map "Unauthorized"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /googledrive/info [get]
func (cs *Controllers) Info(c fiber.Ctx) error {
	return common.RenderConnectorInfo(c, cs.App, config.GetConnectorInfo)
}
