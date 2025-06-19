package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"
	"strconv"
	"time"

	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

func (api *APIControllers) QueriesIndex(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !workspaceOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get all queries in the workspace.
	queries, getQueriesErr := api.DB.GetStoredQueriesByWorkspaceID(workspace.ID)
	if getQueriesErr != nil {
		api.Logger.Error("Error fetching queries", "error", getQueriesErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Filter queries based on user permissions
	filteredQueries, err := lib.IsAllowedFilter(
		api.permissionService,
		user,
		workspace,
		db.PolicyResourceQuery,
		db.PolicyActionRead,
		queries,
		func(q db.StoredQuery) uint { return q.ID },
	)
	if err != nil {
		api.Logger.Error("Error filtering queries by permissions", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Structure the response.
	queriesResponse, formatErr := formatter.FormatIndexResponse(
		filteredQueries,
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
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: queriesResponse,
	})
}

func (api *APIControllers) QueriesStore(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)

	if !dictOk || !workspaceOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.CreateQueryRequest
	if err := c.Bind().JSON(&req); err != nil {
		api.Logger.Error("Error parsing JSON request body", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Pick the name to use for the description, defaulting to the current time if not provided
	name := req.Name
	if name == "" {
		name = strconv.FormatInt(time.Now().Unix(), 10)
	}

	// Create the stored query in the database
	query := &db.StoredQuery{
		Name:        name,
		Description: req.Description,
		SQL:         req.SQL,
		OwnerID:     user.ID,
		WorkspaceID: workspace.ID,
	}
	if saveErr := api.DB.Save(&query).Error; saveErr != nil {
		api.Logger.Error("Error creating stored query", "error", saveErr)
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

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:          db.LogEventTypeCreate,
		Description:   fmt.Sprintf("Query %s created", query.Name),
		UserID:        &user.ID,
		WorkspaceID:   &workspace.ID,
		StoredQueryID: &query.ID,
	})

	// Send the response
	return utils.WriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Data: formattedQuery,
	})
}

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
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: formattedQuery,
	})
}

func (api *APIControllers) QueriesUpdate(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	query, queryOk := c.Locals("stored_query").(*db.StoredQuery)

	if !dictOk || !userOk || !queryOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the JSON request body
	var req irmincore.UpdateQueryRequest
	if err := c.Bind().JSON(&req); err != nil {
		api.Logger.Error("Error parsing JSON request body", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Check if the query exists
	if query == nil {
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "query_not_found")},
		})
	}

	// Update the stored query in the database
	if req.Name != "" {
		query.Name = req.Name
	}
	if req.Description != "" {
		query.Description = req.Description
	}
	if req.SQL != "" {
		query.SQL = req.SQL
	}
	if saveErr := api.DB.Save(&query).Error; saveErr != nil {
		api.Logger.Error("Error updating stored query", "error", saveErr)
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

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:          db.LogEventTypeInfo,
		Description:   fmt.Sprintf("Query %s updated", query.Name),
		UserID:        &user.ID,
		WorkspaceID:   &query.WorkspaceID,
		StoredQueryID: &query.ID,
	})

	// Send the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "query_updated"),
		Data:    formattedQuery,
	})
}

func (api *APIControllers) QueriesDestroy(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	query, queryOk := c.Locals("stored_query").(*db.StoredQuery)

	if !dictOk || !queryOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Delete the stored query from the database
	if deleteStoredQueryErr := api.DB.DeleteStoredQuery(query.ID); deleteStoredQueryErr != nil {
		api.Logger.Error("Error deleting stored query", "error", deleteStoredQueryErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:          db.LogEventTypeDelete,
		Description:   fmt.Sprintf("Query %s deleted", query.Name),
		UserID:        &query.OwnerID,
		WorkspaceID:   &query.WorkspaceID,
		StoredQueryID: &query.ID,
	})

	// Send the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "query_deleted"),
	})
}

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
	if err := c.Bind().JSON(&req); err != nil {
		api.Logger.Error("Error parsing JSON request body", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Validate required fields
	if req.NewOwnerID == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Parse the new owner ID from the sqid
	newOwnerID, decodeSqidsErr := api.SQIDManager.Decode("users", req.NewOwnerID)
	if decodeSqidsErr != nil {
		api.Logger.Error("Error decoding sqid", "error", decodeSqidsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, isUserInWorkspaceErr := api.DB.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
	if isUserInWorkspaceErr != nil {
		api.Logger.Error("Error checking if user is in workspace", "error", isUserInWorkspaceErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "new_owner_invalid")},
		})
	}
	if !inWorkspace {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "new_owner_invalid")},
		})
	}

	// Update the stored query in the database
	query.OwnerID = uint(newOwnerID)
	if saveErr := api.DB.Save(&query).Error; saveErr != nil {
		api.Logger.Error("Error updating stored query", "error", saveErr)
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

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:          db.LogEventTypeInfo,
		Description:   fmt.Sprintf("Query %s ownership transferred to %s", query.Name, query.Owner.Email),
		UserID:        &user.ID,
		WorkspaceID:   &query.WorkspaceID,
		StoredQueryID: &query.ID,
	})

	// Send the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "query_ownership_transferred"),
		Data:    formattedQuery,
	})
}

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
	if err := c.Bind().JSON(&req); err != nil {
		api.Logger.Error("Error parsing JSON request body", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(c.Context(), locale, api.Logger, api.Env)
	if createDataEngineClientErr != nil {
		api.Logger.Error("error creating data engine client", "error", createDataEngineClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeInfo,
		Description: "SQL query execution started",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Execute the SQL
	result := dataEngine.ExecuteQuery(workspace.Slug, req.SQL)
	// Check for errors
	if result.HasErrors {
		api.Logger.Error("Error executing SQL query", "error", result.Logs)
		lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
			Type:        db.LogEventTypeError,
			Description: "SQL query execution failed",
			UserID:      &user.ID,
			WorkspaceID: &workspace.ID,
		})
	} else {
		lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
			Type:        db.LogEventTypeInfo,
			Description: "SQL query execution completed",
			UserID:      &user.ID,
			WorkspaceID: &workspace.ID,
		})
	}

	// Send the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "query_executed"),
		Data:    result,
	})
}

func (api *APIControllers) ExecuteQuery(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	query, queryOk := c.Locals("stored_query").(*db.StoredQuery)

	if !localeOk || !dictOk || !userOk || !workspaceOk || !queryOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Initialize Data Engine client
	dataEngine, createDataEngineClientErr := engine.NewClient(c.Context(), locale, api.Logger, api.Env)
	if createDataEngineClientErr != nil {
		api.Logger.Error("error creating data engine client", "error", createDataEngineClientErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:          db.LogEventTypeInfo,
		Description:   fmt.Sprintf("Query %s execution started", query.Name),
		UserID:        &user.ID,
		WorkspaceID:   &workspace.ID,
		StoredQueryID: &query.ID,
	})

	// Execute the SQL
	result := dataEngine.ExecuteQuery(workspace.Slug, query.SQL)

	// Check for errors
	if result.HasErrors {
		api.Logger.Error("Error executing SQL query", "error", result.Logs)
		lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
			Type:          db.LogEventTypeError,
			Description:   "SQL query execution failed",
			UserID:        &user.ID,
			WorkspaceID:   &workspace.ID,
			StoredQueryID: &query.ID,
		})
	} else {
		lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
			Type:          db.LogEventTypeInfo,
			Description:   "SQL query execution completed",
			UserID:        &user.ID,
			WorkspaceID:   &workspace.ID,
			StoredQueryID: &query.ID,
		})
	}

	// Send the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "query_executed"),
		Data:    result,
	})
}
