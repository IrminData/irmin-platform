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

// OperationStatus handles the status check of an operation using the common framework.
func (cs *Controllers) OperationStatus(c fiber.Ctx) error {
	return common.HandleOperationStatus(c, config.GetConnectorInfo, cs.App)
}
