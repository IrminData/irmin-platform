package mysqlcontrollers

import (
	"irmin-connectors/connectors/common"

	"github.com/gofiber/fiber/v3"
)

// UnsubscribeFromChanges godoc
// @Summary Unsubscribe from MySQL database changes
// @Description Stop monitoring MySQL database changes and remove the subscription
// @Tags mysql
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param subscription_id formData string true "ID of the subscription to remove"
// @Success 200 {object} fiber.Map "Subscription removed successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid parameters"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} fiber.Map "Forbidden - subscription does not belong to this operation"
// @Failure 404 {object} fiber.Map "Subscription not found"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /mysql/operation/unsubscribe [post]
func (cs *Controllers) UnsubscribeFromChanges(c fiber.Ctx) error {
	provider := &common.ListenerManagerUnsubscribeProvider{
		App: cs.App,
	}
	return cs.HandleUnsubscribeFromChanges(c, provider)
}
