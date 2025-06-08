package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/lib"
	"irmin-api/locales"
	"irmin-api/utils"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
)

//nolint:dupl // this function is not a duplicate, but follows the same pattern as the other index functions
func (api *APIControllers) ConnectionsIndex(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	user, userOk := c.Locals("user").(*db.User)
	if !dictOk || !workspaceOk || !userOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get all connections in the workspace.
	connections, getConnectionsByWorkspaceIDErr := api.DB.GetConnectionsByWorkspaceID(workspace.ID)
	if getConnectionsByWorkspaceIDErr != nil {
		api.Logger.Error("Error fetching connections", "error", getConnectionsByWorkspaceIDErr)
		return utils.WriteResponse(c, fiber.StatusNotFound, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Filter connections based on user permissions
	filteredConnections, err := lib.IsAllowedFilter(
		api.permissionService,
		user,
		workspace,
		db.PolicyResourceConnection,
		db.PolicyActionRead,
		connections,
		func(c db.Connection) uint { return c.ID },
	)
	if err != nil {
		api.Logger.Error("Error filtering connections by permissions", "error", err)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Structure the response.
	connectionsResponse, formatErr := formatter.FormatIndexResponse(
		filteredConnections,
		formatter.FormatConnectionResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		api.Logger.Error("Error formatting connections", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: connectionsResponse,
	})
}

func (api *APIControllers) ConnectionsStore(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	if !dictOk || !userOk || !workspaceOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the request body
	fields, parseFormFieldsErr := utils.ParseFormFields(
		c,
		[]string{"name", "connector"},
		[]string{"description", "documentation"},
	)
	if parseFormFieldsErr != nil {
		api.Logger.Error("Error parsing form fields", "error", parseFormFieldsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Parse connection details and settings form the request body
	details := utils.ParseObjectFormFields(c, "details")
	settings := utils.ParseObjectFormFields(c, "settings")

	// Parse the connector ID
	connectorID, decodeConnectorSQIDErr := api.SQIDManager.Decode("connectors", fields["connector"])
	if decodeConnectorSQIDErr != nil {
		api.Logger.Error("Error decoding connector sqid", "error", decodeConnectorSQIDErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Create the connection
	connection := &db.Connection{
		Name:          fields["name"],
		Description:   fields["description"],
		Documentation: fields["documentation"],
		Details:       details,
		Settings:      settings,
		ConnectorID:   uint(connectorID),
		OwnerID:       user.ID,
		WorkspaceID:   workspace.ID,
	}
	if createConnectionErr := api.DB.Create(&connection).Error; createConnectionErr != nil {
		api.Logger.Error("Error creating connection", "error", createConnectionErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Fetch the newly created connection
	connection, getConnectionByIDErr := api.DB.GetConnectionByID(connection.ID)
	if getConnectionByIDErr != nil {
		api.Logger.Error("Error fetching connection", "error", getConnectionByIDErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the connection response
	connectionResponse, formatConnectionResponseErr := formatter.FormatConnectionResponse(connection, api.SQIDManager)
	if formatConnectionResponseErr != nil {
		api.Logger.Error("Error formatting connection response", "error", formatConnectionResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeCreate,
		Description: fmt.Sprintf("Connection %s created", connection.Name),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusCreated, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "connection_created"),
		Data:    connectionResponse,
	})
}

func (api *APIControllers) ConnectionsShow(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	connection, connectionOk := c.Locals("connection").(*db.Connection)
	if !dictOk || !connectionOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Format the connection response
	connectionResponse, formatConnectionResponseErr := formatter.FormatConnectionResponse(connection, api.SQIDManager)
	if formatConnectionResponseErr != nil {
		api.Logger.Error("Error formatting connection response", "error", formatConnectionResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: connectionResponse,
	})
}

func (api *APIControllers) ConnectionsUpdate(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	connection, connectionOk := c.Locals("connection").(*db.Connection)
	if !dictOk || !userOk || !connectionOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the request body - all fields are optional during update
	fields, parseFormFieldsErr := utils.ParseFormFields(
		c,
		nil, // No required fields for update
		[]string{"name", "description", "documentation", "connector"},
	)
	if parseFormFieldsErr != nil {
		api.Logger.Error("Error parsing form fields", "error", parseFormFieldsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Parse connection details and settings form the request body
	details := utils.ParseObjectFormFields(c, "details")
	settings := utils.ParseObjectFormFields(c, "settings")

	// Only update fields that were provided
	if fields["name"] != "" {
		connection.Name = fields["name"]
	}
	if fields["description"] != "" {
		connection.Description = fields["description"]
	}
	if fields["documentation"] != "" {
		connection.Documentation = fields["documentation"]
	}
	if len(details) > 0 {
		connection.Details = details
	}
	if len(settings) > 0 {
		connection.Settings = settings
	}
	if fields["connector"] != "" {
		// Parse the connector ID
		connectorID, decodeConnectorSQIDErr := api.SQIDManager.Decode("connectors", fields["connector"])
		if decodeConnectorSQIDErr != nil {
			api.Logger.Error("Error decoding connector sqid", "error", decodeConnectorSQIDErr)
			return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
				Errors: []string{api.lm.T(dict, "invalid_request")},
			})
		}
		connection.ConnectorID = uint(connectorID)
	}

	// Update the connection
	if updateConnectionErr := api.DB.Save(&connection).Error; updateConnectionErr != nil {
		api.Logger.Error("Error updating connection", "error", updateConnectionErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the connection response
	connectionResponse, formatConnectionResponseErr := formatter.FormatConnectionResponse(
		connection,
		api.SQIDManager,
	)
	if formatConnectionResponseErr != nil {
		api.Logger.Error("Error formatting connection response", "error", formatConnectionResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeUpdate,
		Description: fmt.Sprintf("Connection %s updated", connection.Name),
		UserID:      &user.ID,
		WorkspaceID: &connection.WorkspaceID,
	})

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "connection_updated"),
		Data:    connectionResponse,
	})
}

func (api *APIControllers) ConnectionsDestroy(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	connection, connectionOk := c.Locals("connection").(*db.Connection)
	if !dictOk || !userOk || !connectionOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Delete the connection
	if deleteConnectionErr := api.DB.DeleteConnection(connection.ID); deleteConnectionErr != nil {
		api.Logger.Error("Error deleting connection", "error", deleteConnectionErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type:        db.LogEventTypeDelete,
		Description: fmt.Sprintf("Connection %s deleted", connection.Name),
		UserID:      &user.ID,
		WorkspaceID: &connection.WorkspaceID,
	})

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "connection_deleted"),
	})
}

func (api *APIControllers) TransferConnectionOwnership(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	user, userOk := c.Locals("user").(*db.User)
	workspace, workspaceOk := c.Locals("workspace").(*db.Workspace)
	connection, connectionOk := c.Locals("connection").(*db.Connection)
	if !dictOk || !userOk || !workspaceOk || !connectionOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse the request body
	fields, parseFormFieldsErr := utils.ParseFormFields(c, []string{"new_owner_id"}, nil)
	if parseFormFieldsErr != nil {
		api.Logger.Error("Error parsing form fields", "error", parseFormFieldsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Parse the connector ID
	newOwnerID, decodeNewOwnerSQIDErr := api.SQIDManager.Decode("users", fields["new_owner_id"])
	if decodeNewOwnerSQIDErr != nil {
		api.Logger.Error("Error decoding connector sqid", "error", decodeNewOwnerSQIDErr)
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

	// Update the connection
	connection.OwnerID = uint(newOwnerID)
	if updateConnectionErr := api.DB.Save(&connection).Error; updateConnectionErr != nil {
		api.Logger.Error("Error updating connection", "error", updateConnectionErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Format the connection response
	connectionResponse, formatConnectionResponseErr := formatter.FormatConnectionResponse(
		connection,
		api.SQIDManager,
	)
	if formatConnectionResponseErr != nil {
		api.Logger.Error("Error formatting connection response", "error", formatConnectionResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Log the event
	lib.CreateAuditLogEventAsync(api.DB, api.Logger, &db.LogEvent{
		Type: db.LogEventTypeUpdate,
		Description: fmt.Sprintf(
			"Connection %s ownership transferred to %s",
			connection.Name,
			connection.Owner.Email,
		),
		UserID:      &user.ID,
		WorkspaceID: &workspace.ID,
	})

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "connection_updated"),
		Data:    connectionResponse,
	})
}

func (api *APIControllers) ConnectionSchema(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	connection, connectionOk := c.Locals("connection").(*db.Connection)
	if !localeOk || !dictOk || !connectionOk {
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the operation method from query params
	query, parseQueryParamsErr := utils.ParseQueryParams(c, nil, []string{"operation_method"})
	if parseQueryParamsErr != nil {
		api.Logger.Error("Error parsing query params", "error", parseQueryParamsErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}
	operationMethod := query["operation_method"]
	if operationMethod == "" {
		operationMethod = "pull"
	}

	// Get the schema of the connection
	scm := lib.NewSchemaCacheManager(api.Env, api.Logger, api.DB)
	schema, getConnectionSchemaErr := scm.GetConnectionSchema(
		c.Context(),
		connection,
		operationMethod,
		locale,
		false,
	)
	if getConnectionSchemaErr != nil {
		api.Logger.Error("Error getting connection schema", "error", getConnectionSchemaErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response.
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: schema,
	})
}
