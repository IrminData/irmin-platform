package controllers

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"

	"math"
	"strconv"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

type assetParams struct {
	assetType string
	assetID   uint
}

type logsLocalParams struct {
	dict      locales.Dictionary
	workspace *db.Workspace
	user      *db.User
}

type logsQueryParams struct {
	search    string
	perPage   int
	page      int
	assetType string
	assetID   string
}

func (api *APIControllers) validateLogsParams(c fiber.Ctx) (*logsLocalParams, error) {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		api.Logger.Error("Error validating workspace parameters", "error", err)
		return nil, errors.New("missing required context")
	}

	return &logsLocalParams{dict: dict, workspace: workspace, user: user}, nil
}

func (api *APIControllers) parseLogsQueryParams(c fiber.Ctx) (*logsQueryParams, error) {
	params, err := utils.ParseQueryParams(c, nil, []string{"search", "per_page", "page", "asset_type", "asset_id"})
	if err != nil {
		return nil, err
	}

	queryParams := &logsQueryParams{
		search:    params["search"],
		assetType: params["asset_type"],
		assetID:   params["asset_id"],
	}

	// Parse pagination parameters
	queryParams.perPage = 10
	if params["per_page"] != "" {
		if parsedPerPage, parsePerPageErr := strconv.Atoi(params["per_page"]); parsePerPageErr == nil &&
			parsedPerPage > 0 {
			queryParams.perPage = parsedPerPage
		}
	}

	queryParams.page = 1
	if params["page"] != "" {
		if parsedPage, parsePageErr := strconv.Atoi(params["page"]); parsePageErr == nil && parsedPage > 0 {
			queryParams.page = parsedPage
		}
	}

	return queryParams, nil
}

func (api *APIControllers) getLogEventsWithPagination(
	workspace *db.Workspace,
	queryParams *logsQueryParams,
	assetParams *assetParams,
) ([]db.LogEvent, int64, error) {
	offset := (queryParams.page - 1) * queryParams.perPage

	if assetParams != nil {
		return api.getLogEventsForAsset(
			workspace,
			assetParams.assetType,
			assetParams.assetID,
			queryParams.search,
			queryParams.perPage,
			offset,
		)
	}

	// Get all log events for the workspace
	dbQuery := api.DB.Model(&db.LogEvent{}).Where("workspace_id = ?", workspace.ID)
	if queryParams.search != "" {
		dbQuery = dbQuery.Where("description ILIKE ?", "%"+queryParams.search+"%")
	}

	var total int64
	if err := dbQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var events []db.LogEvent
	err := dbQuery.
		Preload("User").
		Order("created_at DESC").
		Limit(queryParams.perPage).
		Offset(offset).
		Find(&events).Error

	return events, total, err
}

func (api *APIControllers) buildLogsResponse(
	events []irminmodels.LogEvent,
	total int64,
	queryParams *logsQueryParams,
) map[string]any {
	return map[string]any{
		"data":        events,
		"total":       total,
		"per_page":    queryParams.perPage,
		"page":        queryParams.page,
		"total_pages": int(math.Ceil(float64(total) / float64(queryParams.perPage))),
	}
}

// LogsIndex handles retrieving log events for a workspace.
func (api *APIControllers) LogsIndex(c fiber.Ctx) error {
	logsLocalParams, err := api.validateLogsParams(c)
	if err != nil {
		api.Logger.Error("Error validating logs parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse query parameters
	queryParams, err := api.parseLogsQueryParams(c)
	if err != nil {
		api.Logger.Error("Error parsing query params", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(logsLocalParams.dict, "invalid_request")},
		})
	}

	// Get asset parameters if provided
	var assetParams *assetParams
	if queryParams.assetType != "" && queryParams.assetID != "" {
		var getAssetParamsErr error
		assetParams, getAssetParamsErr = api.getAssetParams(map[string]string{
			"asset_type": queryParams.assetType,
			"asset_id":   queryParams.assetID,
		}, logsLocalParams.workspace)
		if getAssetParamsErr != nil {
			api.Logger.Error("Error getting asset parameters", "error", getAssetParamsErr)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(logsLocalParams.dict, "invalid_request")},
			})
		}
	}

	// Get log events
	events, total, err := api.getLogEventsWithPagination(logsLocalParams.workspace, queryParams, assetParams)
	if err != nil {
		api.Logger.Error("Error fetching log events", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(logsLocalParams.dict, "error_occurred")},
		})
	}

	// Filter log events based on user permissions
	filteredEvents, err := lib.IsAllowedFilter(
		api.permissionService,
		logsLocalParams.user,
		logsLocalParams.workspace,
		db.PolicyResourceAuditLog,
		db.PolicyActionRead,
		events,
		func(e db.LogEvent) uint { return e.ID },
	)
	if err != nil {
		api.Logger.Error("Error filtering log events by permissions", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(logsLocalParams.dict, "error_occurred")},
		})
	}

	// Format the log events
	formattedEvents, err := api.formatLogEventsResponse(c.Context(), filteredEvents)
	if err != nil {
		api.Logger.Error("Error formatting log events", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(logsLocalParams.dict, "error_occurred")},
		})
	}

	// Return the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: api.buildLogsResponse(formattedEvents, total, queryParams),
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

	case params["stored_query_id"] != "":
		storedQueryID, err := api.SQIDManager.Decode("queries", params["stored_query_id"])
		if err != nil {
			return nil, fmt.Errorf("decoding stored query ID: %w", err)
		}
		return &assetParams{assetType: "stored_query", assetID: uint(storedQueryID)}, nil

	case params["policy_id"] != "":
		policyID, err := api.SQIDManager.Decode("policies", params["policy_id"])
		if err != nil {
			return nil, fmt.Errorf("decoding policy ID: %w", err)
		}
		return &assetParams{assetType: "policy", assetID: uint(policyID)}, nil

	case params["repository_object_id"] != "":
		repositoryObjectID, err := api.SQIDManager.Decode("repository_objects", params["repository_object_id"])
		if err != nil {
			return nil, fmt.Errorf("decoding repository object ID: %w", err)
		}
		return &assetParams{assetType: "repository_object", assetID: uint(repositoryObjectID)}, nil

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
	ctx context.Context,
	events []db.LogEvent,
) ([]irminmodels.LogEvent, error) {
	var response []irminmodels.LogEvent
	for _, event := range events {
		formattedEvent, err := formatter.FormatLogEventResponse(ctx, api.DB, event, api.SQIDManager)
		if err != nil {
			return nil, err
		}
		response = append(response, *formattedEvent)
	}
	if len(response) == 0 {
		return make([]irminmodels.LogEvent, 0), nil
	}
	return response, nil
}
