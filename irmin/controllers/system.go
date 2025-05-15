package controllers

import (
	"encoding/json"
	"irmin-api/lakefs"
	"irmin-api/orchestrator"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// SystemWebhook handles the webhook events from internal services, like LakeFS.
func (api *APIControllers) SystemWebhook(c fiber.Ctx) error {
	// Make sure the request is authenticated with a system token
	isSystem := c.Locals("is_system").(bool)
	if !isSystem {
		return utils.WriteResponse(c, fiber.StatusUnauthorized, irminmodels.IrminAPIResponse{})
	}

	// Get the query params
	query, err := utils.ParseQueryParams(c, nil, []string{"type"})
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{})
	}

	// Switch based on the type
	switch query["type"] {
	case "lakefs":
		// Handle the lakefs webhook events

		// Parse the LakeFS webhook event
		var webhookEvent lakefs.WebhookEvent
		if err := json.Unmarshal(c.Body(), &webhookEvent); err != nil {
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{})
		}

		// Add the event to the orchestrator
		api.Orchestrator.AddLakefsEvent(&webhookEvent)

		return nil
	case "dispatch":
		// Handle the dispatch events from the orchestrator

		// Parse the dispatch event
		var dispatchEvent orchestrator.DispatchEvent
		if err := json.Unmarshal(c.Body(), &dispatchEvent); err != nil {
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{})
		}

		// Add the event to the orchestrator
		api.Orchestrator.AddDispatchedEvent(&dispatchEvent)

		return nil
	default:
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{})
	}
}
