package controllers

import (
	"irmin-api/db"
	"irmin-api/locales"
	"irmin-api/services"
	"irmin-api/utils"
	"strconv"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// WorkspaceSearch godoc
// @Summary Search workspace
// @Description Search across all resources in a workspace with filtering, pagination, and permission-based results
// @Tags search
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param q query string false "Search query string"
// @Param types query string false "Comma-separated list of resource types to search (workflow,repository,connection,query,user,repository_object,invite)"
// @Param tags query string false "Comma-separated list of tag IDs (SQID encoded)"
// @Param owner query string false "Owner user ID (SQID encoded)"
// @Param date_from query string false "Start date filter (ISO 8601 format)"
// @Param date_to query string false "End date filter (ISO 8601 format)"
// @Param limit query int false "Number of results per page (max 100)" default(20)
// @Param offset query int false "Number of results to skip" default(0)
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.SearchResponse} "Search results with pagination and filtering"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid search parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/search [get]
func (api *APIControllers) WorkspaceSearch(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !workspaceOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{"Workspace not found"},
		})
	}

	// Parse query parameters
	filters, err := api.parseSearchFilters(c)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Perform the search
	searchResponse, err := api.Services.SearchWorkspace(c, user, workspace, filters)
	if err != nil {
		api.Logger.Error("Failed to search workspace", "error", err, "workspace_id", workspace.ID)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: searchResponse,
	})
}

// parseSearchFilters extracts and validates search parameters from the request.
func (api *APIControllers) parseSearchFilters(c fiber.Ctx) (db.SearchFilters, error) {
	filters := db.SearchFilters{
		Query:  strings.TrimSpace(c.Query("q", "")),
		Limit:  services.SearchDefaultLimit,
		Offset: services.SearchDefaultOffset,
	}

	if err := api.parseTypesFilter(c, &filters); err != nil {
		return filters, err
	}

	api.parseTagsFilter(c, &filters)
	api.parseOwnerFilter(c, &filters)
	api.parseDateFilters(c, &filters)
	api.parsePaginationFilters(c, &filters)

	return filters, nil
}

// parseTypesFilter parses and validates the types filter parameter.
func (api *APIControllers) parseTypesFilter(c fiber.Ctx, filters *db.SearchFilters) error {
	typesStr := c.Query("types")
	if typesStr == "" {
		return nil
	}

	filters.Types = strings.Split(typesStr, ",")

	validTypes := map[string]bool{
		"workflow":          true,
		"repository":        true,
		"connection":        true,
		"query":             true,
		"user":              true,
		"repository_object": true,
		"invite":            true,
	}

	for _, t := range filters.Types {
		if !validTypes[strings.TrimSpace(t)] {
			return fiber.NewError(fiber.StatusBadRequest, "Invalid type: "+t)
		}
	}

	return nil
}

// parseTagsFilter parses the tags filter parameter.
func (api *APIControllers) parseTagsFilter(c fiber.Ctx, filters *db.SearchFilters) {
	tagsStr := c.Query("tags")
	if tagsStr == "" {
		return
	}

	tagStrs := strings.Split(tagsStr, ",")
	filters.Tags = make([]uint, 0, len(tagStrs))

	for _, tagStr := range tagStrs {
		tagID, err := api.SQIDManager.Decode("tags", strings.TrimSpace(tagStr))
		if err != nil {
			continue
		}
		filters.Tags = append(filters.Tags, uint(tagID))
	}
}

// parseOwnerFilter parses the owner filter parameter.
func (api *APIControllers) parseOwnerFilter(c fiber.Ctx, filters *db.SearchFilters) {
	ownerStr := c.Query("owner")
	if ownerStr == "" {
		return
	}

	// Parse owner ID from sqid
	ownerID, err := api.SQIDManager.Decode("users", ownerStr)
	if err != nil {
		return
	}

	ownerIDUint := uint(ownerID)
	filters.OwnerID = &ownerIDUint
}

// parseDateFilters parses the date filter parameters.
func (api *APIControllers) parseDateFilters(c fiber.Ctx, filters *db.SearchFilters) {
	if dateFrom := c.Query("date_from"); dateFrom != "" {
		filters.DateFrom = &dateFrom
	}
	if dateTo := c.Query("date_to"); dateTo != "" {
		filters.DateTo = &dateTo
	}
}

// parsePaginationFilters parses the pagination filter parameters.
func (api *APIControllers) parsePaginationFilters(c fiber.Ctx, filters *db.SearchFilters) {
	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 && limit <= 100 {
			filters.Limit = limit
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil && offset >= 0 {
			filters.Offset = offset
		}
	}
}
