package controllers

import (
	"encoding/json"
	"irmin-api/lakefs"
	"irmin-api/orchestrator"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// SystemWebhook godoc
// @Summary System webhook endpoint
// @Description Handle webhook events from internal services (LakeFS, orchestrator dispatch events)
// @Tags system
// @Security SystemAuth
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

	// Switch based on the type
	switch query["type"] {
	case "lakefs":
		// Handle the lakefs webhook events

		// Parse the LakeFS webhook event
		var webhookEvent lakefs.WebhookEvent
		if unmarshalErr := json.Unmarshal(c.Body(), &webhookEvent); unmarshalErr != nil {
			api.Logger.Error("Error unmarshalling LakeFS webhook event", "error", unmarshalErr)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{"Error unmarshalling LakeFS webhook event"},
			})
		}

		// Add the event to the orchestrator
		api.Orchestrator.AddLakefsEvent(&webhookEvent)
	case "dispatch":
		// Handle the dispatch events from the orchestrator

		// Parse the dispatch event
		var dispatchEvent orchestrator.DispatchEvent
		if unmarshalErr := json.Unmarshal(c.Body(), &dispatchEvent); unmarshalErr != nil {
			api.Logger.Error("Error unmarshalling dispatch event", "error", unmarshalErr)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{"Error unmarshalling dispatch event"},
			})
		}

		// Add the event to the orchestrator
		api.Orchestrator.AddDispatchedEvent(&dispatchEvent)
	default:
		api.Logger.Error("Invalid webhook type")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"Invalid webhook type"},
		})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: "Webhook received",
	})
}
