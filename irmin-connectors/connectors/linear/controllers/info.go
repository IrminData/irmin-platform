package linearcontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/linear/config"

	"github.com/gofiber/fiber/v3"
)

// Info godoc
// @Summary Get Linear connector information
// @Description Returns connector metadata including capabilities, OAuth configuration, and dynamic field schema. The embedded ConnectionOAuthConfig is what tells the console to render a Connect-with-Linear button instead of a credential form.
// @Tags linear
// @Security SystemTokenAuth
// @Accept json
// @Produce json
// @Success 200 {object} models.ConnectorDetails "Linear connector information"
// @Failure 401 {object} fiber.Map "Unauthorized"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /linear/info [get]
func (cs *Controllers) Info(c fiber.Ctx) error {
	return common.RenderConnectorInfo(c, cs.App, config.GetConnectorInfo)
}
