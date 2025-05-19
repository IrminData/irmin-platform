package controllers

import (
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

type assetParams struct {
	assetType string
	assetID   uint
}

// LogsIndex handles retrieving log events for a workspace.
func (api *APIControllers) LogsIndex(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	params, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{
		"connection_id",
		"repository",
		"workflow_id",
		"user_id",
		"search",
		"page",
		"per_page",
	})
	if parseQueryParamsErr != nil {
		api.Logger.Error("Error parsing query parameters", "error", parseQueryParamsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	pagination := parsePaginationParams(params)
	var logEvents []db.LogEvent
	var count int64
	var getEventsErr error

	assetParams, err := api.getAssetParams(params, workspace)
	if err != nil {
		api.Logger.Error("Error getting asset parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	if assetParams != nil {
		logEvents, count, getEventsErr = api.getLogEventsForAsset(
			workspace,
			assetParams.assetType,
			assetParams.assetID,
			params["search"],
			pagination.perPage,
			pagination.offset,
		)
	} else {
		logEvents, count, getEventsErr = api.DB.GetLogEventsForWorkspace(
			workspace.ID,
			params["search"],
			pagination.perPage,
			pagination.offset,
		)
	}

	if getEventsErr != nil {
		api.Logger.Error("Error fetching log events", "error", getEventsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	formattedEvents, err := api.formatLogEventsResponse(logEvents)
	if err != nil {
		api.Logger.Error("Error formatting log events", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Pagination: buildPaginationResponse(count, pagination),
		Data:       formattedEvents,
	})
}

// getAssetParams gets the asset parameters from the request.
func (api *APIControllers) getAssetParams(params map[string]string, workspace *db.Workspace) (*assetParams, error) {
	switch {
	case params["connection_id"] != "":
		connectionID, err := api.SQIDManager.Decode("connections", params["connection_id"])
		if err != nil {
			return nil, fmt.Errorf("decoding connection ID: %w", err)
		}
		return &assetParams{assetType: "connection", assetID: uint(connectionID)}, nil

	case params["repository"] != "":
		repository, err := api.DB.GetRepositoryBySlugAndWorkspaceID(params["repository"], workspace.ID)
		if err != nil {
			return nil, fmt.Errorf("fetching repository: %w", err)
		}
		return &assetParams{assetType: "repository", assetID: repository.ID}, nil

	case params["workflow_id"] != "":
		workflowID, err := api.SQIDManager.Decode("workflows", params["workflow_id"])
		if err != nil {
			return nil, fmt.Errorf("decoding workflow ID: %w", err)
		}
		return &assetParams{assetType: "workflow", assetID: uint(workflowID)}, nil

	case params["user_id"] != "":
		userID, err := api.SQIDManager.Decode("users", params["user_id"])
		if err != nil {
			return nil, fmt.Errorf("decoding user ID: %w", err)
		}
		return &assetParams{assetType: "user", assetID: uint(userID)}, nil

	default:
		return nil, errors.New("no asset type found")
	}
}

// getLogEventsForAsset retrieves log events for a specific asset.
func (api *APIControllers) getLogEventsForAsset(
	workspace *db.Workspace,
	assetType string,
	assetID uint,
	search string,
	perPage int,
	offset int,
) ([]db.LogEvent, int64, error) {
	return api.DB.GetLogEventsByWorkspaceAndAsset(
		workspace.ID,
		assetType,
		assetID,
		search,
		perPage,
		offset,
	)
}

// formatLogEventsResponse formats log events for the response.
func (api *APIControllers) formatLogEventsResponse(
	events []db.LogEvent,
) ([]irminmodels.LogEvent, error) {
	var response []irminmodels.LogEvent
	for _, event := range events {
		formattedEvent, err := formatter.FormatLogEventResponse(api.DB, event, api.SQIDManager)
		if err != nil {
			return nil, err
		}
		response = append(response, *formattedEvent)
	}
	return response, nil
}
