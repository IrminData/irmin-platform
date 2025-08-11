package controllers

import (
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// QueriesIndex godoc
// @Summary List stored queries
// @Description Get all stored queries in the workspace that the user has permission to read
// @Tags queries
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.StoredQuery} "Queries retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/queries [get]
func (api *APIControllers) QueriesIndex(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !workspaceOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get all queries in the workspace.
	queries, err := api.Services.ListWorkspaceQueries(c, user, workspace)
	if err != nil {
		api.Logger.Error("Error fetching queries", "error", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Structure the response.
	queriesResponse, formatErr := formatter.FormatIndexResponse(
		queries,
		formatter.FormatStoredQueryResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		api.Logger.Error("Error formatting queries", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: queriesResponse,
	})
}

// QueriesStore godoc
// @Summary Create stored query
// @Description Create a new stored query in the workspace
// @Tags queries
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param request body irmincore.CreateQueryRequest true "Query creation parameters"
// @Success 201 {object} irminmodels.IrminAPIResponse{data=irminmodels.StoredQuery} "Query created successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/queries [post]
func (api *APIControllers) QueriesStore(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)

	if !dictOk || !workspaceOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.CreateQueryRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Create the query
	query, err := api.Services.CreateQuery(c, user, workspace, req)
	if err != nil {
		api.Logger.Error("Error creating query", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the stored query
	formattedQuery, formatStoredQueryResponseErr := formatter.FormatStoredQueryResponse(query, api.SQIDManager)
	if formatStoredQueryResponseErr != nil {
		api.Logger.Error("Error formatting stored query", "error", formatStoredQueryResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate caches for queries listing and items (all users in workspace)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/queries", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Send the response
	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Data: formattedQuery,
	})
}

// QueriesShow godoc
// @Summary Get stored query details
// @Description Get details of a specific stored query by its ID
// @Tags queries
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param query_id path string true "Query ID (SQID)"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.StoredQuery} "Query retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Query not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/queries/{query_id} [get]
func (api *APIControllers) QueriesShow(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	query, queryOk := c.Locals("stored_query").(*db.StoredQuery)

	if !dictOk || !queryOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Format the stored query
	formattedQuery, formatStoredQueryResponseErr := formatter.FormatStoredQueryResponse(query, api.SQIDManager)
	if formatStoredQueryResponseErr != nil {
		api.Logger.Error("Error formatting stored query", "error", formatStoredQueryResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Send the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: formattedQuery,
	})
}

// QueriesUpdate godoc
// @Summary Update stored query
// @Description Update an existing stored query's properties
// @Tags queries
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param query_id path string true "Query ID (SQID)"
// @Param request body irmincore.UpdateQueryRequest true "Query update parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.StoredQuery} "Query updated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Query not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/queries/{query_id} [patch]
//
//nolint:dupl // This is similar to other update endpoints
func (api *APIControllers) QueriesUpdate(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)
	query, queryOk := c.Locals("stored_query").(*db.StoredQuery)

	if !dictOk || !userOk || !queryOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.UpdateQueryRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Update the query
	query, err := api.Services.UpdateQuery(c, user, workspace, query, req)
	if err != nil {
		api.Logger.Error("Error updating query", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the stored query
	formattedQuery, formatStoredQueryResponseErr := formatter.FormatStoredQueryResponse(query, api.SQIDManager)
	if formatStoredQueryResponseErr != nil {
		api.Logger.Error("Error formatting stored query", "error", formatStoredQueryResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate caches for queries listing and items (all users in workspace)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/queries", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Send the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "query_updated"),
		Data:    formattedQuery,
	})
}

// QueriesDestroy godoc
// @Summary Delete stored query
// @Description Delete an existing stored query from the workspace
// @Tags queries
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param query_id path string true "Query ID (SQID)"
// @Success 200 {object} irminmodels.IrminAPIResponse "Query deleted successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Query not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/queries/{query_id} [delete]
func (api *APIControllers) QueriesDestroy(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)
	query, queryOk := c.Locals("stored_query").(*db.StoredQuery)

	if !dictOk || !queryOk || !workspaceOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Delete the query
	err := api.Services.DeleteQuery(c, user, workspace, query)
	if err != nil {
		api.Logger.Error("Error deleting query", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate caches for queries listing and items (all users in workspace)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/queries", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Send the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "query_deleted"),
	})
}

// TransferQueryOwnership godoc
// @Summary Transfer query ownership
// @Description Transfer ownership of a stored query to another user in the workspace
// @Tags queries
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param query_id path string true "Query ID (SQID)"
// @Param request body irmincore.TransferQueryOwnershipRequest true "Ownership transfer parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.StoredQuery} "Query ownership transferred successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body or new owner"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Query not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/queries/{query_id}/transfer-ownership [post]
//
//nolint:dupl // This is similar to other transfer endpoints
func (api *APIControllers) TransferQueryOwnership(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	query, queryOk := c.Locals("stored_query").(*db.StoredQuery)

	if !dictOk || !userOk || !workspaceOk || !queryOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.TransferQueryOwnershipRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Transfer the query ownership
	query, err := api.Services.TransferQueryOwnership(c, user, workspace, query, req)
	if err != nil {
		api.Logger.Error("Error transferring query ownership", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the stored query
	formattedQuery, formatStoredQueryResponseErr := formatter.FormatStoredQueryResponse(query, api.SQIDManager)
	if formatStoredQueryResponseErr != nil {
		api.Logger.Error("Error formatting stored query", "error", formatStoredQueryResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate caches for queries in this workspace (all users)
	if invalidationErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/queries", workspace.Slug),
	); invalidationErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidationErr)
	}

	// Send the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "query_ownership_transferred"),
		Data:    formattedQuery,
	})
}

// ExecuteSQL godoc
// @Summary Execute SQL query
// @Description Execute an arbitrary SQL query on the workspace data
// @Tags queries
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param request body irmincore.ExecuteSQLRequest true "SQL query to execute"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.QueryResult} "SQL query executed successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body or SQL"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/execute-sql [post]
func (api *APIControllers) ExecuteSQL(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)

	if !localeOk || !dictOk || !userOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.ExecuteSQLRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Execute the SQL
	result, err := api.Services.ExecuteSQL(c, locale, user, workspace, req)
	if err != nil {
		api.Logger.Error("Error executing SQL query", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Send the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "query_executed"),
		Data:    result,
	})
}

// ExecuteQuery godoc
// @Summary Execute stored query
// @Description Execute a specific stored query and return the results
// @Tags queries
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param query_id path string true "Query ID (SQID)"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.QueryResult} "Query executed successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Query not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/queries/{query_id}/execute [post]
func (api *APIControllers) ExecuteQuery(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	query, queryOk := c.Locals("stored_query").(*db.StoredQuery)

	if !localeOk || !dictOk || !userOk || !workspaceOk || !queryOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Execute the SQL
	result, err := api.Services.ExecuteSQL(c, locale, user, workspace, irmincore.ExecuteSQLRequest{
		SQL: query.SQL,
	})
	if err != nil {
		api.Logger.Error("Error executing stored query", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Send the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "query_executed"),
		Data:    result,
	})
}
