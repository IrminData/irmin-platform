package controllers

import (
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

func LogsIndex(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	params, err := utils.ParseQueryParams(c, nil, []string{
		"connection_id",
		"repository_id",
		"workflow_id",
		"workflow_run_id",
		"user_id",
	})
	if err != nil {
		log.Printf("Error parsing query parameters: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Find log events based on the provided parameters
	var logEvents []db.LogEvent
	if params["connection_id"] != "" {
		connectionId, err := utils.DecodeSqids("connections", params["connection_id"])
		if err != nil {
			log.Printf("Error decoding connection ID: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		logEvents, err = db.GetLogEventsByWorkspaceAndAsset(workspace.ID, "connection", uint(connectionId))
		if err != nil {
			log.Printf("Error fetching log events for connection ID: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	} else if params["repository_id"] != "" {
		repositoryId, err := utils.DecodeSqids("repositories", params["repository_id"])
		if err != nil {
			log.Printf("Error decoding repository ID: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		logEvents, err = db.GetLogEventsByWorkspaceAndAsset(workspace.ID, "repository", uint(repositoryId))
		if err != nil {
			log.Printf("Error fetching log events for repository ID: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	} else if params["workflow_id"] != "" {
		workflowId, err := utils.DecodeSqids("workflows", params["workflow_id"])
		if err != nil {
			log.Printf("Error decoding workflow ID: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		logEvents, err = db.GetLogEventsByWorkspaceAndAsset(workspace.ID, "workflow", uint(workflowId))
		if err != nil {
			log.Printf("Error fetching log events for workflow ID: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	} else if params["workflow_run_id"] != "" {
		workflowRunId, err := utils.DecodeSqids("workflow-runs", params["workflow_run_id"])
		if err != nil {
			log.Printf("Error decoding workflow run ID: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		logEvents, err = db.GetLogEventsByWorkspaceAndAsset(workspace.ID, "workflow_run", uint(workflowRunId))
		if err != nil {
			log.Printf("Error fetching log events for workflow run ID: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	} else if params["user_id"] != "" {
		userId, err := utils.DecodeSqids("users", params["user_id"])
		if err != nil {
			log.Printf("Error decoding user ID: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		logEvents, err = db.GetLogEventsByWorkspaceAndAsset(workspace.ID, "user", uint(userId))
		if err != nil {
			log.Printf("Error fetching log events for user ID: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	} else {
		// Return all log events for the workspace if no specific asset is provided
		logEvents, err = db.GetLogEventsForWorkspace(workspace.ID)
		if err != nil {
			log.Printf("Error fetching log events for workspace ID: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	}

	// Format the log events for the response
	var response []irminModels.LogEvent
	for _, event := range logEvents {
		formattedEvent, err := formatter.FormatLogEventResponse(event)
		if err != nil {
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		response = append(response, *formattedEvent)
	}

	// Return the formatted log events as a JSON response
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: response,
	})
}
