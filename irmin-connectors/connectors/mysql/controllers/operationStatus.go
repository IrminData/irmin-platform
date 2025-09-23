package mysqlcontrollers

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/connectors/mysql/config"
	"irmin-connectors/models"

	"github.com/gofiber/fiber/v3"
)

// GetConnectorInfo implements the OperationStatusProvider interface.
func (cs *Controllers) GetConnectorInfo() models.ConnectorDetails {
	return config.GetConnectorInfo()
}

// OperationStatus godoc
// @Summary Get MySQL operation status
// @Description Get the current status of a MySQL operation using the operation token
// @Tags mysql
// @Security SystemTokenAuth
// @Accept json
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Success 200 {object} common.OperationStatus "Operation status retrieved successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /mysql/operation/status [post]
func (cs *Controllers) OperationStatus(c fiber.Ctx) error {
	return common.HandleOperationStatus(c, config.GetConnectorInfo, cs.App)
}
