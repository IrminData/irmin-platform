package controllers

import (
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/utils"
	"log"

	"github.com/gofiber/fiber/v3"
)

func ConnectionsIndex(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Get all connections in the workspace.
	connections, err := db.GetConnectionsByWorkspaceID(workspace.ID)
	if err != nil {
		log.Printf("Error fetching connections: %v", err)
		return utils.WriteResponse(c, fiber.StatusNotFound, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Structure the response.
	var connectionsResponse []db.ConnectionResponse
	for _, connection := range connections {
		// Format the connection response
		connectionResponse, err := formatter.FormatConnectionResponse(connection)
		if err != nil {
			log.Printf("Error fetching connection: %v", err)
			return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
				Errors: []string{dict.T("error_occurred")},
			})
		}
		connectionsResponse = append(connectionsResponse, *connectionResponse)
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Data: connectionsResponse,
	})
}

func ConnectionsStore(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	user := c.Locals("user").(*db.User)
	workspace := c.Locals("workspace").(*db.Workspace)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, []string{"name", "connector"}, []string{"description", "documentation"})
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Parse connection details and settings form the request body
	details := utils.ParseObjectFormFields(c, "details")
	settings := utils.ParseObjectFormFields(c, "settings")

	// Parse the connector ID
	connectorID, err := utils.DecodeSqids("connectors", fields["connector"])
	if err != nil {
		log.Printf("Error decoding connector sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Create the connection
	connection, err := db.CreateConnection(&db.Connection{
		Name:          fields["name"],
		Description:   fields["description"],
		Documentation: fields["documentation"],
		Details:       details,
		Settings:      settings,
		ConnectorID:   uint(connectorID),
		OwnerID:       user.ID,
		WorkspaceID:   workspace.ID,
	})
	if err != nil {
		log.Printf("Error creating connection: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Fetch the newly created connection
	connection, err = db.GetConnectionByID(connection.ID)
	if err != nil {
		log.Printf("Error fetching connection: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Format the connection response
	connectionResponse, err := formatter.FormatConnectionResponse(*connection)
	if err != nil {
		log.Printf("Error fetching connection: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusCreated, utils.IrminAPIResponse{
		Message: dict.T("connection_created"),
		Data:    connectionResponse,
	})
}

func ConnectionsShow(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	connection := c.Locals("connection").(*db.Connection)

	// Format the connection response
	connectionResponse, err := formatter.FormatConnectionResponse(*connection)
	if err != nil {
		log.Printf("Error formatting connection response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Data: connectionResponse,
	})
}

func ConnectionsUpdate(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	connection := c.Locals("connection").(*db.Connection)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, []string{"name", "description", "documentation", "connector"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Parse connection details and settings form the request body
	details := utils.ParseObjectFormFields(c, "details")
	settings := utils.ParseObjectFormFields(c, "settings")

	// Prepare the fields to update
	updates := map[string]any{
		"name":          fields["name"],
		"description":   fields["description"],
		"documentation": fields["documentation"],
	}
	if len(details) > 0 {
		updates["details"] = details
	}
	if len(settings) > 0 {
		updates["settings"] = settings
	}
	if fields["connector"] != "" {
		// Parse the connector ID
		connectorID, err := utils.DecodeSqids("connectors", fields["connector"])
		if err != nil {
			log.Printf("Error decoding connector sqid: %v", err)
			return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
				Errors: []string{dict.T("invalid_request")},
			})
		}
		updates["connector_id"] = connectorID
	}

	// Update the connection
	updatedConnection, err := db.UpdateConnection(connection.ID, updates)
	if err != nil {
		log.Printf("Error updating connection: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Format the connection response
	connectionResponse, err := formatter.FormatConnectionResponse(*updatedConnection)
	if err != nil {
		log.Printf("Error formatting connection response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("connection_updated"),
		Data:    connectionResponse,
	})
}

func ConnectionsDestroy(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	connection := c.Locals("connection").(*db.Connection)

	// Delete the connection
	if err := db.DeleteConnection(connection.ID); err != nil {
		log.Printf("Error deleting connection: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("connection_deleted"),
	})
}

func TransferConnectionOwnership(c fiber.Ctx) error {
	dict := c.Locals("dict").(locales.Dictionary)
	workspace := c.Locals("workspace").(*db.Workspace)
	connection := c.Locals("connection").(*db.Connection)

	// Parse the request body
	fields, err := utils.ParseFormFields(c, []string{"new_owner_id"}, nil)
	if err != nil {
		log.Printf("Error parsing form fields: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Parse the connector ID
	newOwnerID, err := utils.DecodeSqids("users", fields["new_owner_id"])
	if err != nil {
		log.Printf("Error decoding connector sqid: %v", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("invalid_request")},
		})
	}

	// Make sure the new owner is valid and a member of the workspace
	inWorkspace, err := db.IsUserInWorkspace(uint(newOwnerID), workspace.ID)
	if err != nil {
		log.Printf("Error checking if user is in workspace: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("new_owner_invalid")},
		})
	}
	if !inWorkspace {
		return utils.WriteResponse(c, fiber.StatusBadRequest, utils.IrminAPIResponse{
			Errors: []string{dict.T("new_owner_invalid")},
		})
	}

	// Update the connection
	updatedConnection, err := db.UpdateConnection(connection.ID, map[string]any{
		"owner_id": newOwnerID,
	})
	if err != nil {
		log.Printf("Error updating connection: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Format the connection response
	connectionResponse, err := formatter.FormatConnectionResponse(*updatedConnection)
	if err != nil {
		log.Printf("Error formatting connection response: %v", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, utils.IrminAPIResponse{
			Errors: []string{dict.T("error_occurred")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, utils.IrminAPIResponse{
		Message: dict.T("connection_updated"),
		Data:    connectionResponse,
	})
}
