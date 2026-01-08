package firecrawlcontrollers

import (
	"irmin-connectors/connectors/common"

	"github.com/gofiber/fiber/v3"
)

// OperationCancel godoc
// @Summary Cancel Firecrawl operation
// @Description Cancel an ongoing Firecrawl operation using the operation token
// @Tags firecrawl
// @Security SystemTokenAuth
// @Accept json
// @Produce json
// @Param operation_token formData string true "Operation token received from operation/init"
// @Success 200 {object} fiber.Map "Operation cancelled successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation token"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} fiber.Map "Operation not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /firecrawl/operation/cancel [post]
func (cs *Controllers) OperationCancel(c fiber.Ctx) error {
	return common.CancelOperation(c, cs.App, common.DefaultDatabaseCancellation)
}
