package controllers

import (
	"context"
	"errors"
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/services"
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
	search  string
	perPage int
	page    int
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
	params, err := utils.ParseQueryParams(c, nil, []string{
		"search", "per_page", "page",
		"repository", "user_id", "workflow_id", "connection_id",
		"stored_query_id", "policy_id", "repository_object_id",
	})
	if err != nil {
		return nil, fmt.Errorf("%w: %w", services.ErrInvalidQueryParams, err)
	}

	queryParams := &logsQueryParams{
		search: params["search"],
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
	c context.Context,
	workspace *db.Workspace,
	user *db.User,
	queryParams *logsQueryParams,
	assetParams *assetParams,
) ([]db.LogEvent, int64, error) {
	offset := (queryParams.page - 1) * queryParams.perPage

	if assetParams != nil {
		return api.Services.ListLogEventsForWorkspaceAndAsset(
			c,
			workspace,
			user,
			assetParams.assetType,
			assetParams.assetID,
			queryParams.search,
			queryParams.perPage,
			offset,
		)
	}

	// Get all log events for the workspace
	return api.Services.ListLogEventsForWorkspace(
		c,
		workspace,
		user,
		queryParams.search,
		queryParams.perPage,
		offset,
	)
}

func (api *APIControllers) buildLogsResponse(
	events []irminmodels.LogEvent,
	total int64,
	queryParams *logsQueryParams,
) irminmodels.IrminAPIResponse {
	totalItems := int(total)
	totalPages := int(math.Ceil(float64(total) / float64(queryParams.perPage)))
	return irminmodels.IrminAPIResponse{
		Pagination: &irminmodels.IrminAPIPaginationMetadata{
			Total:      &totalItems,
			PerPage:    &queryParams.perPage,
			Page:       &queryParams.page,
			TotalPages: &totalPages,
		},
		Data: events,
	}
}

// LogsIndex godoc
// @Summary List audit logs
// @Description Get audit log events for a workspace with optional filtering and pagination
// @Tags logs
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param search query string false "Search term to filter log descriptions"
// @Param per_page query int false "Number of items per page" default(10)
// @Param page query int false "Page number" default(1)
// @Param repository query string false "Filter by repository slug"
// @Param user_id query string false "Filter by user ID (SQID)"
// @Param workflow_id query string false "Filter by workflow ID (SQID)"
// @Param connection_id query string false "Filter by connection ID (SQID)"
// @Param stored_query_id query string false "Filter by stored query ID (SQID)"
// @Param policy_id query string false "Filter by policy ID (SQID)"
// @Param repository_object_id query string false "Filter by repository object ID (SQID)"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.LogEvent,pagination=irminmodels.IrminAPIPaginationMetadata} "Log events retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid query parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/logs [get]
func (api *APIControllers) LogsIndex(c fiber.Ctx) error {
	logsLocalParams, err := api.validateLogsParams(c)
	if err != nil {
		api.Logger.Error("Failed to validate logs parameters", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse query parameters
	queryParams, err := api.parseLogsQueryParams(c)
	if err != nil {
		return api.handleServiceError(c, "Failed to parse query params", err, logsLocalParams.dict)
	}

	// Get asset parameters if provided
	var assetParams *assetParams

	// Build parameter map from query parameters
	paramMap := make(map[string]string)
	if repository := c.Query("repository"); repository != "" {
		paramMap["repository"] = repository
	}
	if userID := c.Query("user_id"); userID != "" {
		paramMap["user_id"] = userID
	}
	if workflowID := c.Query("workflow_id"); workflowID != "" {
		paramMap["workflow_id"] = workflowID
	}
	if connectionID := c.Query("connection_id"); connectionID != "" {
		paramMap["connection_id"] = connectionID
	}
	if storedQueryID := c.Query("stored_query_id"); storedQueryID != "" {
		paramMap["stored_query_id"] = storedQueryID
	}
	if policyID := c.Query("policy_id"); policyID != "" {
		paramMap["policy_id"] = policyID
	}
	if repositoryObjectID := c.Query("repository_object_id"); repositoryObjectID != "" {
		paramMap["repository_object_id"] = repositoryObjectID
	}

	// Get asset parameters if any filter is provided
	if len(paramMap) > 0 {
		var getAssetParamsErr error
		assetParams, getAssetParamsErr = api.getAssetParams(paramMap, logsLocalParams.workspace)
		if getAssetParamsErr != nil {
			return api.handleServiceError(c, "Failed to get asset parameters", getAssetParamsErr, logsLocalParams.dict)
		}
	}

	// Get log events (permissions are filtered in the service)
	events, total, err := api.getLogEventsWithPagination(
		c,
		logsLocalParams.workspace,
		logsLocalParams.user,
		queryParams,
		assetParams,
	)
	if err != nil {
		return api.handleServiceError(c, "Failed to fetch log events", err, logsLocalParams.dict)
	}

	// Format the log events
	formattedEvents, err := api.formatLogEventsResponse(c, events)
	if err != nil {
		return api.handleServiceError(c, "Failed to format log events", err, logsLocalParams.dict)
	}

	// Return the response
	return api.validateAndWriteResponse(
		c,
		fiber.StatusOK,
		api.buildLogsResponse(formattedEvents, total, queryParams),
	)
}

// getAssetParams gets the asset parameters from the request.
func (api *APIControllers) getAssetParams(params map[string]string, workspace *db.Workspace) (*assetParams, error) {
	switch {
	case params["connection_id"] != "":
		connectionID, err := api.SQIDManager.Decode("connections", params["connection_id"])
		if err != nil {
			return nil, fmt.Errorf("%w: decoding connection ID: %w", services.ErrInvalidQueryParams, err)
		}
		return &assetParams{assetType: "connection", assetID: uint(connectionID)}, nil

	case params["repository"] != "":
		repository, err := api.DB.GetRepositoryBySlugAndWorkspaceID(params["repository"], workspace.ID)
		if err != nil {
			return nil, fmt.Errorf("%w: fetching repository: %w", services.ErrInvalidQueryParams, err)
		}
		return &assetParams{assetType: "repository", assetID: repository.ID}, nil

	case params["workflow_id"] != "":
		workflowID, err := api.SQIDManager.Decode("workflows", params["workflow_id"])
		if err != nil {
			return nil, fmt.Errorf("%w: decoding workflow ID: %w", services.ErrInvalidQueryParams, err)
		}
		return &assetParams{assetType: "workflow", assetID: uint(workflowID)}, nil

	case params["stored_query_id"] != "":
		storedQueryID, err := api.SQIDManager.Decode("queries", params["stored_query_id"])
		if err != nil {
			return nil, fmt.Errorf("%w: decoding stored query ID: %w", services.ErrInvalidQueryParams, err)
		}
		return &assetParams{assetType: "stored_query", assetID: uint(storedQueryID)}, nil

	case params["policy_id"] != "":
		policyID, err := api.SQIDManager.Decode("policies", params["policy_id"])
		if err != nil {
			return nil, fmt.Errorf("%w: decoding policy ID: %w", services.ErrInvalidQueryParams, err)
		}
		return &assetParams{assetType: "policy", assetID: uint(policyID)}, nil

	case params["repository_object_id"] != "":
		repositoryObjectID, err := api.SQIDManager.Decode("repository_objects", params["repository_object_id"])
		if err != nil {
			return nil, fmt.Errorf("%w: decoding repository object ID: %w", services.ErrInvalidQueryParams, err)
		}
		return &assetParams{assetType: "repository_object", assetID: uint(repositoryObjectID)}, nil

	case params["user_id"] != "":
		userID, err := api.SQIDManager.Decode("users", params["user_id"])
		if err != nil {
			return nil, fmt.Errorf("%w: decoding user ID: %w", services.ErrInvalidQueryParams, err)
		}
		return &assetParams{assetType: "user", assetID: uint(userID)}, nil

	default:
		return nil, fmt.Errorf("%w: no asset type found", services.ErrInvalidQueryParams)
	}
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
