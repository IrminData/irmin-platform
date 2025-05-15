package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"
	"strconv"
	"time"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

func (api *APIControllers) QueriesIndex(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Get all stored queries for the workspace
	queries, err := api.DB.GetStoredQueriesByWorkspaceID(workspace.ID)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Format the stored queries
	var formattedQueries []irminmodels.StoredQuery
	for _, query := range queries {
		formattedQuery, err := formatter.FormatStoredQueryResponse(&query)
		if err != nil {
			log.Printf("Error formatting stored query: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		formattedQueries = append(formattedQueries, *formattedQuery)
	}

	// Send the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: formattedQueries,
	})
}

func (api *APIControllers) QueriesStore(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	user := c.Locals("user").(*db.User)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, nil, []string{"name", "description", "sql"})
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Pick the name to use for the description, defaulting to the current time if not provided
	name := fields["name"]
	if name == "" {
		name = strconv.FormatInt(time.Now().Unix(), 10)
	}

	// Create the stored query in the database
	query := &db.StoredQuery{
		Name:        name,
		Description: fields["description"],
		SQL:         fields["sql"],
		OwnerID:     user.ID,
		WorkspaceID: workspace.ID,
	}
	storedQuery, err := api.DB.CreateStoredQuery(query)
	if err != nil {
		log.Printf("Error creating stored query: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Format the stored query
	formattedQuery, err := formatter.FormatStoredQueryResponse(storedQuery)
	if err != nil {
		log.Printf("Error formatting stored query: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	api.DB.CreateLogEvent(&db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Query %s created", storedQuery.Name),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Send the response
	return utils.WriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Data: formattedQuery,
	})
}

func (api *APIControllers) QueriesShow(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	query := c.Locals("stored_query").(*db.StoredQuery)

	// Format the stored query
	formattedQuery, err := formatter.FormatStoredQueryResponse(query)
	if err != nil {
		log.Printf("Error formatting stored query: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Send the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: formattedQuery,
	})
}

func (api *APIControllers) QueriesUpdate(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	query := c.Locals("stored_query").(*db.StoredQuery)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, nil, []string{"name", "description", "sql"})
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Construct the updates map
	updates := map[string]any{}
	if fields["name"] != "" {
		updates["name"] = fields["name"]
	}
	if fields["description"] != "" {
		updates["description"] = fields["description"]
	}
	if fields["sql"] != "" {
		updates["sql"] = fields["sql"]
	}

	// Update the stored query in the database
	updatedQuery, err := api.DB.UpdateStoredQuery(query.ID, updates)
	if err != nil {
		log.Printf("Error updating stored query: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Format the stored query
	formattedQuery, err := formatter.FormatStoredQueryResponse(updatedQuery)
	if err != nil {
		log.Printf("Error formatting stored query: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	api.DB.CreateLogEvent(&db.LogEvent{
		Type:        db.LogEventTypeInfo,
		Description: fmt.Sprintf("Query %s updated", updatedQuery.Name),
		UserID:      &user.ID,
		WorkspaceID: &updatedQuery.WorkspaceID,
	})

	// Send the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: dict.T("query_updated"),
		Data:    formattedQuery,
	})
}

func (api *APIControllers) QueriesDestroy(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	query := c.Locals("stored_query").(*db.StoredQuery)

	// Delete the stored query from the database
	if err := api.DB.DeleteStoredQuery(query.ID); err != nil {
		log.Printf("Error deleting stored query: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	api.DB.CreateLogEvent(&db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("Query %s deleted", query.Name),
		UserID:      &query.OwnerID,
		WorkspaceID: &query.WorkspaceID,
	})

	// Send the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: dict.T("query_deleted"),
	})
}

func (api *APIControllers) TransferQueryOwnership(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)
	query := c.Locals("stored_query").(*db.StoredQuery)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, []string{"new_owner_id"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Parse the new owner ID from the sqid
	newOwnerID, err := utils.DecodeSqids("users", fields["new_owner_id"])
	if err != nil {
		log.Printf("Error decoding sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, err := api.DB.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
	if err != nil {
		log.Printf("Error checking if user is in workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("new_owner_invalid")},
		})
	}
	if !inWorkspace {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("new_owner_invalid")},
		})
	}

	// Update the stored query in the database
	updatedQuery, err := api.DB.UpdateStoredQuery(query.ID, map[string]any{
		"owner_id": newOwnerID,
	})
	if err != nil {
		log.Printf("Error updating stored query: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Format the stored query
	formattedQuery, err := formatter.FormatStoredQueryResponse(updatedQuery)
	if err != nil {
		log.Printf("Error formatting stored query: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Log the event
	api.DB.CreateLogEvent(&db.LogEvent{
		Type:        db.LogEventTypeInfo,
		Description: fmt.Sprintf("Query %s ownership transferred to %s", updatedQuery.Name, updatedQuery.Owner.Email),
		UserID:      &user.ID,
		WorkspaceID: &updatedQuery.WorkspaceID,
	})

	// Send the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: dict.T("query_ownership_transferred"),
		Data:    formattedQuery,
	})
}

func (api *APIControllers) ExecuteSQL(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, nil, []string{"sql"})
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Initialize Data Engine client
	dataEngine := engine.NewClient(locale)

	// Log the event
	api.DB.CreateLogEvent(&db.LogEvent{
		Type:        db.LogEventTypeInfo,
		Description: "SQL query execution started",
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Execute the SQL
	result := dataEngine.ExecuteQuery(workspace.Slug, fields["sql"])
	// Check for errors
	if result.HasErrors {
		log.Printf("Error executing SQL query: %v", result.Logs)
		api.DB.CreateLogEvent(&db.LogEvent{
			Type:        db.LogEventTypeError,
			Description: "SQL query execution failed",
			UserID:      &user.ID,
			WorkspaceID: &workspace.ID,
		})
	} else {
		// Log the event
		api.DB.CreateLogEvent(&db.LogEvent{
			Type:        db.LogEventTypeInfo,
			Description: "SQL query execution completed",
			UserID:      &user.ID,
			WorkspaceID: &workspace.ID,
		})
	}

	// Send the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: dict.T("query_executed"),
		Data:    result,
	})
}

func (api *APIControllers) ExecuteQuery(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)
	query := c.Locals("stored_query").(*db.StoredQuery)

	// Initialize Data Engine client
	dataEngine := engine.NewClient(locale)

	// Log the event
	api.DB.CreateLogEvent(&db.LogEvent{
		Type:        db.LogEventTypeInfo,
		Description: fmt.Sprintf("Query %s execution started", query.Name),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Execute the SQL
	result := dataEngine.ExecuteQuery(workspace.Slug, query.SQL)

	// Check for errors
	if result.HasErrors {
		log.Printf("Error executing SQL query: %v", result.Logs)
		api.DB.CreateLogEvent(&db.LogEvent{
			Type:        db.LogEventTypeError,
			Description: "SQL query execution failed",
			UserID:      &user.ID,
			WorkspaceID: &workspace.ID,
		})
	} else {
		// Log the event
		api.DB.CreateLogEvent(&db.LogEvent{
			Type:        db.LogEventTypeInfo,
			Description: "SQL query execution completed",
			UserID:      &user.ID,
			WorkspaceID: &workspace.ID,
		})
	}

	// Send the response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: dict.T("query_executed"),
		Data:    result,
	})
}
