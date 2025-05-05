package controllers

import (
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"
	"math"
	"strconv"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

func LogsIndex(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	params, err := utils.ParseQueryParams(c, nil, []string{
		"connection_id",
		"repository",
		"workflow_id",
		"user_id",
		"page",
		"per_page",
	})
	if err != nil {
		log.Printf("Error parsing query parameters: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Determine the pagination parameters
	per_page := 100
	page := 1
	if params["per_page"] != "" {
		parsedPerPage, err := strconv.Atoi(params["per_page"])
		if err == nil {
			per_page = parsedPerPage
		}
	}
	if params["page"] != "" {
		parsedPage, err := strconv.Atoi(params["page"])
		if err == nil {
			page = parsedPage
		}
	}
	offset := (page - 1) * per_page

	// Find log events based on the provided parameters
	var logEvents []db.LogEvent
	var count int64
	if params["connection_id"] != "" {
		connectionId, err := utils.DecodeSqids("connections", params["connection_id"])
		if err != nil {
			log.Printf("Error decoding connection ID: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		logEvents, count, err = db.GetLogEventsByWorkspaceAndAsset(workspace.ID, "connection", uint(connectionId), per_page, offset)
		if err != nil {
			log.Printf("Error fetching log events for connection ID: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	} else if params["repository"] != "" {
		repository, err := db.GetRepositoryBySlugAndWorkspaceID(params["repository"], workspace.ID)
		if err != nil {
			log.Printf("Error fetching repository by slug: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		logEvents, count, err = db.GetLogEventsByWorkspaceAndAsset(workspace.ID, "repository", repository.ID, per_page, offset)
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
		logEvents, count, err = db.GetLogEventsByWorkspaceAndAsset(workspace.ID, "workflow", uint(workflowId), per_page, offset)
		if err != nil {
			log.Printf("Error fetching log events for workflow ID: %v", err)
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
		logEvents, count, err = db.GetLogEventsByWorkspaceAndAsset(workspace.ID, "user", uint(userId), per_page, offset)
		if err != nil {
			log.Printf("Error fetching log events for user ID: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
	} else {
		// Return all log events for the workspace if no specific asset is provided
		logEvents, count, err = db.GetLogEventsForWorkspace(workspace.ID, per_page, offset)
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
	totalPages := int(math.Ceil(float64(count) / float64(per_page)))
	hasMore := page < totalPages
	var nextPage *string
	if hasMore {
		nextPageStr := strconv.Itoa(page + 1)
		nextPage = &nextPageStr
	}
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Pagination: &irminModels.IrminAPIPaginationMetadata{
			Total:      int(count),
			TotalPages: totalPages,
			Page:       &page,
			PerPage:    per_page,
			HasMore:    hasMore,
			Next:       nextPage,
		},
		Data: response,
	})
}
