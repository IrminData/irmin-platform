package controllers

import (
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// SystemWebhook godoc
// @Summary System webhook endpoint
// @Description Handle webhook events from internal services (LakeFS, orchestrator dispatch events)
// @Tags system
// @Security SystemTokenAuth
// @Accept json
// @Produce json
// @Param type query string true "Webhook type (lakefs, dispatch)"
// @Param body body object true "Webhook payload (varies by type)"
// @Success 200 {object} irminmodels.IrminAPIResponse "Webhook processed successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid webhook type or payload"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid system authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /system/webhook [post]
func (api *APIControllers) SystemWebhook(c fiber.Ctx) error {
	isSystem, isSystemOk := c.Locals("is_system").(bool)
	if !isSystemOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{"Access denied"},
		})
	}

	// Make sure the request is authenticated with a system token
	if !isSystem {
		return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{
			Errors: []string{"Access denied"},
		})
	}

	// Get the query params
	query, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{"type"})
	if parseQueryParamsErr != nil {
		api.Logger.Error("Error parsing query params", "error", parseQueryParamsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"Error parsing query params"},
		})
	}

	// Process the system webhook
	err := api.Services.ProcessSystemWebhook(c, query["type"], c.Body(), isSystem)
	if err != nil {
		api.Logger.Error("Error processing system webhook", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"Error processing system webhook"},
		})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: "Webhook received",
	})
}
