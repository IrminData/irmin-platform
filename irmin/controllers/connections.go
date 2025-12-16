package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/services"
	"irmin-api/utils"

	irmincache "irmin-api/cache"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

// ConnectionsIndex godoc
// @Summary List connections in workspace
// @Description Get all connections in the specified workspace that the user has permission to read
// @Tags connections
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.Connection} "Connections retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Workspace not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/connections [get]
func (api *APIControllers) ConnectionsIndex(c fiber.Ctx) error {
	_, dict, user, workspace, err := api.validateWorkspaceParams(c)
	if err != nil {
		return api.handleServiceError(
			c,
			"Error validating workspace parameters",
			services.NewInternalError(err.Error()),
			dict,
		)
	}

	// Get the connections
	connections, err := api.Services.ListConnections(c, user, workspace)
	if err != nil {
		return api.handleServiceError(c, "Failed to list connections", err, dict)
	}

	// Structure the response.
	connectionsResponse, formatErr := formatter.FormatIndexResponse(
		connections,
		formatter.FormatConnectionResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format connections",
			services.NewInternalErrorf("error formatting connections: %v", formatErr),
			dict,
		)
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: connectionsResponse,
	})
}

// ConnectionsStore godoc
// @Summary Create a new connection
// @Description Create a new connection in the specified workspace
// @Tags connections
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param request body irmincore.CreateConnectionRequest true "Connection creation parameters"
// @Success 201 {object} irminmodels.IrminAPIResponse{data=irminmodels.Connection} "Connection created successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/connections [post]
func (api *APIControllers) ConnectionsStore(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	locale, localeOk := c.Locals("locale").(string)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !userOk || !localeOk || !workspaceOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ConnectionsStore",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse and validate the JSON request body
	var req irmincore.CreateConnectionRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Create the connection
	connection, err := api.Services.CreateConnection(c.Context(), locale, user, workspace, req)
	if err != nil {
		return api.handleServiceError(c, "Failed to create connection", err, dict)
	}

	// Format the connection response
	connectionResponse, formatConnectionResponseErr := formatter.FormatConnectionResponse(connection, api.SQIDManager)
	if formatConnectionResponseErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format connection response",
			services.NewInternalErrorf("error formatting connection response: %v", formatConnectionResponseErr),
			dict,
		)
	}

	// Invalidate caches that may be affected by this action
	invalidateCacheErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/connections", workspace.Slug),
	)
	if invalidateCacheErr != nil {
		api.Logger.Error("Failed to invalidate cache", "error", invalidateCacheErr)
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "connection_created"),
		Data:    connectionResponse,
	})
}

// ConnectionsShow godoc
// @Summary Get connection details
// @Description Get details of a specific connection by its slug
// @Tags connections
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param connection_slug path string true "Connection ID"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Connection} "Connection retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Connection not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/connections/{connection_slug} [get]
func (api *APIControllers) ConnectionsShow(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	connection, connectionOk := c.Locals("connection").(*db.Connection)
	if !dictOk || !connectionOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ConnectionsShow",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Mask secrets
	api.Services.MaskConnectionSecrets(c.Context(), connection)

	// Format the connection response
	connectionResponse, formatConnectionResponseErr := formatter.FormatConnectionResponse(connection, api.SQIDManager)
	if formatConnectionResponseErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format connection response",
			services.NewInternalErrorf("error formatting connection response: %v", formatConnectionResponseErr),
			dict,
		)
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: connectionResponse,
	})
}

// ConnectionsUpdate godoc
// @Summary Update connection
// @Description Update an existing connection's details
// @Tags connections
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param connection_slug path string true "Connection ID"
// @Param request body irmincore.UpdateConnectionRequest true "Connection update parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Connection} "Connection updated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Connection not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/connections/{connection_slug} [patch]
//
//nolint:dupl // this function is not a duplicate, but follows the same pattern as the other update functions
func (api *APIControllers) ConnectionsUpdate(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	connection, connectionOk := c.Locals("connection").(*db.Connection)
	if !dictOk || !userOk || !workspaceOk || !connectionOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ConnectionsUpdate",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse and validate the JSON request body
	var req irmincore.UpdateConnectionRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Update the connection
	connection, err := api.Services.UpdateConnection(c, user, workspace, connection, req)
	if err != nil {
		return api.handleServiceError(c, "Failed to update connection", err, dict)
	}

	// Format the connection response
	connectionResponse, formatConnectionResponseErr := formatter.FormatConnectionResponse(
		connection,
		api.SQIDManager,
	)
	if formatConnectionResponseErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format connection response",
			services.NewInternalErrorf("error formatting connection response: %v", formatConnectionResponseErr),
			dict,
		)
	}

	// Invalidate caches that may be affected by this action
	invalidateCacheErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/connections", workspace.Slug),
	)
	if invalidateCacheErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidateCacheErr)
	}

	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "connection_updated"),
		Data:    connectionResponse,
	})
}

// ConnectionsUpdateConfiguration godoc
// @Summary Update connection configuration
// @Description Update an existing connection's configuration (details and settings)
// @Tags connections
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param connection_slug path string true "Connection ID"
// @Param request body irmincore.UpdateConnectionConfigurationRequest true "Connection configuration update parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Connection} "Connection configuration updated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Connection not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/connections/{connection_slug}/configuration [patch]
func (api *APIControllers) ConnectionsUpdateConfiguration(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	connection, connectionOk := c.Locals("connection").(*db.Connection)
	if !localeOk || !dictOk || !userOk || !workspaceOk || !connectionOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ConnectionsUpdateConfiguration",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse and validate the JSON request body
	var req irmincore.UpdateConnectionConfigurationRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Update the connection configuration
	updatedConnection, err := api.Services.UpdateConnectionConfiguration(
		c.Context(),
		locale,
		user,
		workspace,
		connection,
		req,
	)
	if err != nil {
		return api.handleServiceError(c, "Failed to update connection configuration", err, dict)
	}

	// Format the connection response
	connectionResponse, formatConnectionResponseErr := formatter.FormatConnectionResponse(
		updatedConnection,
		api.SQIDManager,
	)
	if formatConnectionResponseErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format connection response",
			services.NewInternalErrorf("error formatting connection response: %v", formatConnectionResponseErr),
			dict,
		)
	}

	// Invalidate caches that may be affected by this action
	invalidateCacheErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/connections", workspace.Slug),
	)
	if invalidateCacheErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidateCacheErr)
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "connection_updated"),
		Data:    connectionResponse,
	})
}

// ConnectionsDestroy godoc
// @Summary Delete connection
// @Description Delete an existing connection from the workspace
// @Tags connections
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param connection_slug path string true "Connection ID"
// @Success 200 {object} irminmodels.IrminAPIResponse "Connection deleted successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Connection not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/connections/{connection_slug} [delete]
func (api *APIControllers) ConnectionsDestroy(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	connection, connectionOk := c.Locals("connection").(*db.Connection)
	if !dictOk || !userOk || !workspaceOk || !connectionOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ConnectionsDestroy",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Delete the connection
	err := api.Services.DeleteConnection(c, user, workspace, connection)
	if err != nil {
		return api.handleServiceError(c, "Failed to delete connection", err, dict)
	}

	// Invalidate caches that may be affected by this action
	invalidateCacheErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/connections", workspace.Slug),
	)
	if invalidateCacheErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidateCacheErr)
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "connection_deleted"),
	})
}

// TransferConnectionOwnership godoc
// @Summary Transfer connection ownership
// @Description Transfer ownership of a connection to another user in the workspace
// @Tags connections
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param connection_slug path string true "Connection ID"
// @Param request body irmincore.TransferConnectionOwnershipRequest true "Ownership transfer parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Connection} "Connection ownership transferred successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body or new owner"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Connection not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/connections/{connection_slug}/transfer-ownership [post]
//
//nolint:dupl // this function is not a duplicate, but follows the same pattern as the other update and ownership transfer functions
func (api *APIControllers) TransferConnectionOwnership(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	connection, connectionOk := c.Locals("connection").(*db.Connection)
	if !dictOk || !userOk || !workspaceOk || !connectionOk {
		return api.handleServiceError(
			c,
			"Error getting locals for TransferConnectionOwnership",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse and validate the JSON request body
	var req irmincore.TransferConnectionOwnershipRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Transfer the connection ownership
	connection, err := api.Services.TransferConnectionOwnership(c, user, workspace, connection, req)
	if err != nil {
		return api.handleServiceError(c, "Failed to transfer connection ownership", err, dict)
	}

	// Format the connection response
	connectionResponse, formatConnectionResponseErr := formatter.FormatConnectionResponse(
		connection,
		api.SQIDManager,
	)
	if formatConnectionResponseErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format connection response",
			services.NewInternalErrorf("error formatting connection response: %v", formatConnectionResponseErr),
			dict,
		)
	}

	// Invalidate caches that may be affected by this action
	invalidateCacheErr := irmincache.InvalidatePathPrefixForAllUsers(
		api.cacheStorage,
		fmt.Sprintf("/api/v1/workspaces/%s/connections", workspace.Slug),
	)
	if invalidateCacheErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidateCacheErr)
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "connection_updated"),
		Data:    connectionResponse,
	})
}

// ConnectionSchema godoc
// @Summary Get connection schema
// @Description Get the schema information for a specific connection and operation method
// @Tags connections
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param connection_slug path string true "Connection ID"
// @Param operation_method query string false "Operation method (pull, push)" default(pull)
// @Param path query string false "Path within the connection to get schema for, empty string means the root path"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=object} "Connection schema retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid query parameters"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Connection not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/connections/{connection_slug}/schema [get]
func (api *APIControllers) ConnectionSchema(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	connection, connectionOk := c.Locals("connection").(*db.Connection)
	if !localeOk || !dictOk || !userOk || !workspaceOk || !connectionOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ConnectionSchema",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Get the operation method and path from query params
	query, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{"operation_method", "path"})
	if parseQueryParamsErr != nil {
		return api.handleServiceError(
			c,
			"Failed to parse query params",
			fmt.Errorf("%w: %w", services.ErrInvalidQueryParams, parseQueryParamsErr),
			dict,
		)
	}

	// Get the schema of the connection
	schema, getConnectionSchemaErr := api.Services.GetConnectionSchema(
		c,
		locale,
		user,
		workspace,
		connection,
		query["operation_method"],
		query["path"],
	)
	if getConnectionSchemaErr != nil {
		return api.handleServiceError(c, "Failed to get connection schema", getConnectionSchemaErr, dict)
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: schema,
	})
}

// TestConnection godoc
// @Summary Test connection
// @Description Test an existing connection using its stored credentials
// @Tags connections
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param workspace_slug path string true "Workspace slug"
// @Param connection_slug path string true "Connection ID"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.ConnectorConfigurationValidationResult} "Connection tested successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Connection not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /workspaces/{workspace_slug}/connections/{connection_slug}/test [post]
func (api *APIControllers) TestConnection(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	connection, connectionOk := c.Locals("connection").(*db.Connection)
	if !localeOk || !dictOk || !userOk || !workspaceOk || !connectionOk {
		return api.handleServiceError(
			c,
			"Error getting locals for TestConnection",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Test the connection
	result, err := api.Services.TestConnection(c, locale, user, workspace, connection)
	if err != nil {
		return api.handleServiceError(c, "Failed to test connection", err, dict)
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "connection_tested"),
		Data:    result,
	})
}
