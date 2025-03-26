package controllers

import (
	"irmin-api/db"
	"irmin-api/engine"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"
	"strconv"
	"time"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

func QueriesIndex(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Get all stored queries for the workspace
	queries, err := db.GetStoredQueriesByWorkspaceID(workspace.ID)
	if err != nil {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Format the stored queries
	var formattedQueries []db.StoredQueryResponse
	for _, query := range queries {
		formattedQuery, err := formatter.FormatStoredQueryResponse(&query)
		if err != nil {
			log.Printf("Error formatting stored query: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		formattedQueries = append(formattedQueries, *formattedQuery)
	}

	// Send the response
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: formattedQueries,
	})
}

func QueriesStore(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	user := c.Locals("user").(*db.User)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, nil, []string{"name", "description", "sql"})
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
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
	storedQuery, err := db.CreateStoredQuery(query)
	if err != nil {
		log.Printf("Error creating stored query: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Format the stored query
	formattedQuery, err := formatter.FormatStoredQueryResponse(storedQuery)
	if err != nil {
		log.Printf("Error formatting stored query: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Send the response
	return utils.WriteResponse(c, fiber.StatusCreated, irminModels.IrminAPIResponse{
		Data: formattedQuery,
	})
}

func QueriesShow(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	query := c.Locals("stored_query").(*db.StoredQuery)

	// Format the stored query
	formattedQuery, err := formatter.FormatStoredQueryResponse(query)
	if err != nil {
		log.Printf("Error formatting stored query: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Send the response
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: formattedQuery,
	})
}

func QueriesUpdate(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	query := c.Locals("stored_query").(*db.StoredQuery)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, nil, []string{"name", "description", "sql"})
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
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
	updatedQuery, err := db.UpdateStoredQuery(query.ID, updates)
	if err != nil {
		log.Printf("Error updating stored query: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Format the stored query
	formattedQuery, err := formatter.FormatStoredQueryResponse(updatedQuery)
	if err != nil {
		log.Printf("Error formatting stored query: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Send the response
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Message: dict.T("query_updated"),
		Data:    formattedQuery,
	})
}

func QueriesDestroy(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	query := c.Locals("stored_query").(*db.StoredQuery)

	// Delete the stored query from the database
	if err := db.DeleteStoredQuery(query.ID); err != nil {
		log.Printf("Error deleting stored query: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Send the response
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Message: dict.T("query_deleted"),
	})
}

func TransferQueryOwnership(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	query := c.Locals("stored_query").(*db.StoredQuery)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, []string{"new_owner_id"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Parse the new owner ID from the sqid
	newOwnerID, err := utils.DecodeSqids("users", fields["new_owner_id"])
	if err != nil {
		log.Printf("Error decoding sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, err := db.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
	if err != nil {
		log.Printf("Error checking if user is in workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("new_owner_invalid")},
		})
	}
	if !inWorkspace {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("new_owner_invalid")},
		})
	}

	// Update the stored query in the database
	updatedQuery, err := db.UpdateStoredQuery(query.ID, map[string]any{
		"owner_id": newOwnerID,
	})
	if err != nil {
		log.Printf("Error updating stored query: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Format the stored query
	formattedQuery, err := formatter.FormatStoredQueryResponse(updatedQuery)
	if err != nil {
		log.Printf("Error formatting stored query: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Send the response
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Message: dict.T("query_ownership_transferred"),
		Data:    formattedQuery,
	})
}

func ExecuteSQL(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, nil, []string{"sql"})
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Initialize Data Engine client
	DataEngine := engine.NewClient(locale)

	// Execute the SQL
	results, err := DataEngine.ExecuteQuery(workspace.Description, fields["sql"])
	if err != nil {
		log.Printf("Error executing query: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Send the response
	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: results,
	})
}

func ExecuteQuery(c fiber.Ctx) error {
	locale := c.Locals("locale").(string)
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	query := c.Locals("stored_query").(*db.StoredQuery)

	// Initialize Data Engine client
	DataEngine := engine.NewClient(locale)

	// Execute the SQL
	results, err := DataEngine.ExecuteQuery(workspace.Description, query.SQL)
	if err != nil {
		log.Printf("Error executing query: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminModels.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	return utils.WriteResponse(c, fiber.StatusOK, irminModels.IrminAPIResponse{
		Data: results,
	})
}
