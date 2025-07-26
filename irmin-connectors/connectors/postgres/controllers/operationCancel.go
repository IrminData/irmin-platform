package postgrescontrollers

import (
	"irmin-connectors/connectors/common"

	"github.com/gofiber/fiber/v3"
)

// OperationCancel handles the cancellation of an operation.
func (cs *Controllers) OperationCancel(c fiber.Ctx) error {
	return common.CancelOperation(c, cs.App, common.DefaultDatabaseCancellation)
}
