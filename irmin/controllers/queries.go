package controllers

import (
	"fmt"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/services"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
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
		return api.handleServiceError(
			c,
			"Error getting locals for QueriesIndex",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Get all queries in the workspace.
	queries, err := api.Services.ListWorkspaceQueries(c, user, workspace)
	if err != nil {
		return api.handleServiceError(c, "Error fetching queries", err, dict)
	}

	// Structure the response.
	queriesResponse, formatErr := formatter.FormatIndexResponse(
		queries,
		formatter.FormatStoredQueryResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		return api.handleServiceError(
			c,
			"Error formatting queries",
			services.NewInternalErrorf("error formatting queries: %v", formatErr),
			dict,
		)
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
		return api.handleServiceError(
			c,
			"Error getting locals for QueriesStore",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the JSON request body
	var req irmincore.CreateQueryRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Create the query
	query, err := api.Services.CreateQuery(c, user, workspace, req)
	if err != nil {
		return api.handleServiceError(c, "Error creating query", err, dict)
	}

	// Format the stored query
	formattedQuery, formatStoredQueryResponseErr := formatter.FormatStoredQueryResponse(query, api.SQIDManager)
	if formatStoredQueryResponseErr != nil {
		return api.handleServiceError(
			c,
			"Error formatting stored query",
			services.NewInternalErrorf("error formatting stored query: %v", formatStoredQueryResponseErr),
			dict,
		)
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
		return api.handleServiceError(
			c,
			"Error getting locals for QueriesShow",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Format the stored query
	formattedQuery, formatStoredQueryResponseErr := formatter.FormatStoredQueryResponse(query, api.SQIDManager)
	if formatStoredQueryResponseErr != nil {
		return api.handleServiceError(
			c,
			"Error formatting stored query",
			services.NewInternalErrorf("error formatting stored query: %v", formatStoredQueryResponseErr),
			dict,
		)
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
		return api.handleServiceError(
			c,
			"Error getting locals for QueriesUpdate",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the JSON request body
	var req irmincore.UpdateQueryRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Update the query
	query, err := api.Services.UpdateQuery(c, user, workspace, query, req)
	if err != nil {
		return api.handleServiceError(c, "Error updating query", err, dict)
	}

	// Format the stored query
	formattedQuery, formatStoredQueryResponseErr := formatter.FormatStoredQueryResponse(query, api.SQIDManager)
	if formatStoredQueryResponseErr != nil {
		return api.handleServiceError(
			c,
			"Error formatting stored query",
			services.NewInternalErrorf("error formatting stored query: %v", formatStoredQueryResponseErr),
			dict,
		)
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
		return api.handleServiceError(
			c,
			"Error getting locals for QueriesDestroy",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Delete the query
	err := api.Services.DeleteQuery(c, user, workspace, query)
	if err != nil {
		return api.handleServiceError(c, "Error deleting query", err, dict)
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
		return api.handleServiceError(
			c,
			"Error getting locals for TransferQueryOwnership",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the JSON request body
	var req irmincore.TransferQueryOwnershipRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Transfer the query ownership
	query, err := api.Services.TransferQueryOwnership(c, user, workspace, query, req)
	if err != nil {
		return api.handleServiceError(c, "Error transferring query ownership", err, dict)
	}

	// Format the stored query
	formattedQuery, formatStoredQueryResponseErr := formatter.FormatStoredQueryResponse(query, api.SQIDManager)
	if formatStoredQueryResponseErr != nil {
		return api.handleServiceError(
			c,
			"Error formatting stored query",
			services.NewInternalErrorf("error formatting stored query: %v", formatStoredQueryResponseErr),
			dict,
		)
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
		return api.handleServiceError(
			c,
			"Error getting locals for ExecuteSQL",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse the JSON request body
	var req irmincore.ExecuteSQLRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Check for limit-response query parameter
	limitResponse := c.Query("limit-response") == queryParamValueTrue

	// Execute the SQL
	result, err := api.Services.ExecuteSQL(c, locale, user, workspace, req, limitResponse)
	if err != nil {
		return api.handleServiceError(c, "Error executing SQL query", err, dict)
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
// @Param request body irmincore.ExecuteSQLRequest false "Execution options (e.g., input files)"
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
		return api.handleServiceError(
			c,
			"Error getting locals for ExecuteQuery",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse request body (optional - for inputs)
	var req irmincore.ExecuteSQLRequest

	// Check if request body exists
	bodyLen := len(c.Body())
	if bodyLen > 0 {
		// Body exists - validate and bind it properly
		// This will return proper errors for malformed JSON or validation failures
		if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
			// validateAndBindRequestWithResponse already wrote a response if validation failed.
			// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
			return validationErr
		}
	} else {
		// No body provided - that's okay, proceed with empty request
		api.Logger.InfoContext(c.Context(), "No request body provided for query execution", "query", query.ID)
	}

	// Check for limit-response query parameter
	limitResponse := c.Query("limit-response") == queryParamValueTrue

	// Execute the query
	result, err := api.Services.ExecuteQuery(c, locale, user, workspace, query, req, limitResponse)
	if err != nil {
		return api.handleServiceError(c, "Error executing stored query", err, dict)
	}

	// Send the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "query_executed"),
		Data:    result,
	})
}

// QueryTemplatesIndex godoc
// @Summary List query templates
// @Description Get all available query templates
// @Tags queries
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.Template} "Templates retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/queries/templates [get]
func (api *APIControllers) QueryTemplatesIndex(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	if !dictOk {
		return api.handleServiceError(
			c,
			"Error getting locals for QueryTemplatesIndex",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Get all query templates
	templates, err := api.Services.ListTemplatesByType(c, irminmodels.TemplateTypeQuery)
	if err != nil {
		return api.handleServiceError(c, "Error fetching query templates", err, dict)
	}

	// Format the response
	templatesResponse, formatErr := formatter.FormatIndexResponse(
		templates,
		formatter.FormatTemplateResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		return api.handleServiceError(
			c,
			"Error formatting templates",
			services.NewInternalErrorf("error formatting templates: %v", formatErr),
			dict,
		)
	}

	// Return the response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: templatesResponse,
	})
}
