package httpcontrollers

import (
	"irmin-connectors/connectors/common"
	httpconfig "irmin-connectors/connectors/http/config"

	"github.com/gofiber/fiber/v3"
)

// OperationStatus godoc
// @Summary Get HTTP operation status
// @Description Get the current status of an HTTP operation using the operation token
// @Tags http
// @Security SystemTokenAuth
// @Accept json
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Success 200 {object} common.OperationStatus "Operation status retrieved successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /http/operation/status [post]
func (cs *Controllers) OperationStatus(c fiber.Ctx) error {
	return common.HandleOperationStatus(c, httpconfig.GetConnectorInfo, cs.App)
}
