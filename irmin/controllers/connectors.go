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

// ConnectorsIndex godoc
// @Summary List all connectors
// @Description Get a list of all available connectors in the system
// @Tags connectors
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]irminmodels.Connector} "Connectors retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /connectors [get]
func (api *APIControllers) ConnectorsIndex(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	if !dictOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ConnectorsIndex",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Get all connectors
	connectors, err := api.Services.ListConnectors(c)
	if err != nil {
		return api.handleServiceError(c, "Failed to list connectors", err, dict)
	}

	// Structure the response.
	connectorsResponse, formatErr := formatter.FormatIndexResponse(
		connectors,
		formatter.FormatConnectorResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format connectors",
			services.NewInternalErrorf("error formatting connectors: %v", formatErr),
			dict,
		)
	}

	// Return the connectors
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: connectorsResponse,
	})
}

// ConnectorsShow godoc
// @Summary Get connector details
// @Description Get details of a specific connector by its slug
// @Tags connectors
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param connector_slug path string true "Connector slug"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Connector} "Connector retrieved successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Connector not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /connectors/{connector_slug} [get]
func (api *APIControllers) ConnectorsShow(c fiber.Ctx) error {
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	connector, connectorOk := c.Locals("connector").(*db.Connector)
	if !dictOk || !connectorOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ConnectorsShow",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Create the response
	connectorResponse, formatConnectorResponseErr := formatter.FormatConnectorResponse(connector, api.SQIDManager)
	if formatConnectorResponseErr != nil {
		return api.handleServiceError(
			c,
			fmt.Sprintf("Failed to format connector response for connector %d", connector.ID),
			services.NewInternalErrorf("error formatting connector response: %v", formatConnectorResponseErr),
			dict,
		)
	}

	// Return the connector info
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: connectorResponse,
	})
}

// ConnectorsStore godoc
// @Summary Register a new connector
// @Description Register a new connector with the system (system authentication required)
// @Tags connectors
// @Security SystemTokenAuth
// @Accept json
// @Produce json
// @Param request body irmincore.ConnectorRequest true "Connector registration parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Connector} "Connector registered successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - system authentication required"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /connectors [post]
func (api *APIControllers) ConnectorsStore(c fiber.Ctx) error {
	isSystem, isSystemOk := c.Locals("is_system").(bool)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	locale, localeOk := c.Locals("locale").(string)
	if !dictOk || !localeOk || !isSystemOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ConnectorsStore",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse JSON request body
	var req irmincore.ConnectorRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Create the connector
	connector, err := api.Services.CreateConnector(c, locale, isSystem, req)
	if err != nil {
		return api.handleServiceError(c, "Failed to create connector", err, dict)
	}

	// Create the response
	connectorResponse, formatConnectorResponseErr := formatter.FormatConnectorResponse(connector, api.SQIDManager)
	if formatConnectorResponseErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format connector response",
			services.NewInternalErrorf("error formatting connector response: %v", formatConnectorResponseErr),
			dict,
		)
	}

	// Invalidate caches affected by this action (all users)
	if invalidateCacheErr := irmincache.InvalidatePathPrefixForAllUsers(api.cacheStorage, "/api/v1/connectors"); invalidateCacheErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidateCacheErr)
	}

	// Return the connector info
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "connector_refreshed"),
		Data:    connectorResponse,
	})
}

// ConnectorsUpdate godoc
// @Summary Update connector
// @Description Update an existing connector's information (system authentication required)
// @Tags connectors
// @Security SystemTokenAuth
// @Accept json
// @Produce json
// @Param connector_slug path string true "Connector slug"
// @Param request body irmincore.ConnectorRequest true "Connector update parameters"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=irminmodels.Connector} "Connector updated successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - system authentication required"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Connector not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /connectors/{connector_slug} [patch]
func (api *APIControllers) ConnectorsUpdate(c fiber.Ctx) error {
	isSystem, isSystemOk := c.Locals("is_system").(bool)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	locale, localeOk := c.Locals("locale").(string)
	connector, connectorOk := c.Locals("connector").(*db.Connector)
	if !dictOk || !localeOk || !connectorOk || !isSystemOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ConnectorsUpdate",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse JSON request body
	var req irmincore.ConnectorRequest
	if err := c.Bind().JSON(&req); err != nil {
		api.Logger.Error("Error parsing JSON request", "error", err)
		return api.handleServiceError(c, "Failed to parse JSON request", services.ErrInvalidRequest, dict)
	}

	// Update the connector
	connector, err := api.Services.UpdateConnector(c, locale, isSystem, connector, req)
	if err != nil {
		return api.handleServiceError(c, "Failed to update connector", err, dict)
	}

	// Create the response
	connectorResponse, formatConnectorResponseErr := formatter.FormatConnectorResponse(connector, api.SQIDManager)
	if formatConnectorResponseErr != nil {
		return api.handleServiceError(
			c,
			"Failed to format connector response",
			services.NewInternalErrorf("error formatting connector response: %v", formatConnectorResponseErr),
			dict,
		)
	}

	// Invalidate caches affected by this action (all users)
	if invalidateCacheErr := irmincache.InvalidatePathPrefixForAllUsers(api.cacheStorage, "/api/v1/connectors"); invalidateCacheErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidateCacheErr)
	}

	// Return the connector info
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "connector_refreshed"),
		Data:    connectorResponse,
	})
}

// ConnectorsDestroy godoc
// @Summary Delete connector
// @Description Delete an existing connector from the system (system authentication required)
// @Tags connectors
// @Security SystemTokenAuth
// @Accept json
// @Produce json
// @Param connector_slug path string true "Connector slug"
// @Success 200 {object} irminmodels.IrminAPIResponse "Connector deleted successfully"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 403 {object} irminmodels.IrminAPIResponse "Forbidden - system authentication required"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Connector not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /connectors/{connector_slug} [delete]
func (api *APIControllers) ConnectorsDestroy(c fiber.Ctx) error {
	isSystem, isSystemOk := c.Locals("is_system").(bool)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	connector, connectorOk := c.Locals("connector").(*db.Connector)
	if !dictOk || !connectorOk || !isSystemOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ConnectorsDestroy",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Delete the connector
	if err := api.Services.DeleteConnector(c, connector, isSystem); err != nil {
		return api.handleServiceError(c, "Failed to delete connector", err, dict)
	}

	// Invalidate caches affected by this action (all users)
	if invalidateCacheErr := irmincache.InvalidatePathPrefixForAllUsers(api.cacheStorage, "/api/v1/connectors"); invalidateCacheErr != nil {
		api.Logger.Error("Error invalidating cache", "error", invalidateCacheErr)
	}

	// Return the success response
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "connector_deleted"),
	})
}

// ShowConnectorConfigurationFields godoc
// @Summary Get connector configuration fields
// @Description Get the dynamic configuration fields for a specific connector and configuration type
// @Tags connectors
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param connector_slug path string true "Connector slug"
// @Param type path string true "Configuration type (details, settings)"
// @Param request body irmincore.ConnectorConfigurationRequest true "Current configuration data"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=[]object} "Configuration fields retrieved successfully"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body or configuration type"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Connector not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /connectors/{connector_slug}/config-fields/{type} [post]
func (api *APIControllers) ShowConnectorConfigurationFields(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	connector, connectorOk := c.Locals("connector").(*db.Connector)
	if !localeOk || !dictOk || !connectorOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ShowConnectorConfigurationFields",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Get the type of the configuration fields to fetch
	configurationType := c.Params("type")
	if configurationType == "" {
		return api.handleServiceError(
			c,
			"Failed to get connector configuration fields",
			services.ErrInvalidRequest,
			dict,
		)
	}

	// Parse JSON request body
	var req irmincore.ConnectorConfigurationRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		// validateAndBindRequestWithResponse already wrote a response if validation failed.
		// If it returns an error, it's a write error (e.g., connection closed), so return it directly.
		return validationErr
	}

	// Get the configuration fields
	configurationFields, err := api.Services.GetConnectorConfigurationFields(
		c,
		locale,
		connector,
		configurationType,
		req,
	)
	if err != nil {
		return api.handleServiceError(c, "Failed to get connector configuration fields", err, dict)
	}

	// Return the array of the dynamic fields required for the connection settings
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: configurationFields,
	})
}

// ValidateConnectorConfiguration godoc
// @Summary Validate connector configuration
// @Description Validate the configuration parameters for a specific connector
// @Tags connectors
// @Security ApiKeyAuth
// @Accept json
// @Produce json
// @Param connector_slug path string true "Connector slug"
// @Param request body irmincore.ConnectorConfigurationRequest true "Configuration data to validate"
// @Success 200 {object} irminmodels.IrminAPIResponse{data=object} "Configuration validation result"
// @Failure 400 {object} irminmodels.IrminAPIResponse "Bad request - invalid request body"
// @Failure 401 {object} irminmodels.IrminAPIResponse "Unauthorized - invalid or missing authentication"
// @Failure 404 {object} irminmodels.IrminAPIResponse "Connector not found"
// @Failure 500 {object} irminmodels.IrminAPIResponse "Internal server error"
// @Router /connectors/{connector_slug}/validate-config [post]
func (api *APIControllers) ValidateConnectorConfiguration(c fiber.Ctx) error {
	locale, localeOk := c.Locals("locale").(string)
	dict, dictOk := c.Locals("dict").(locales.Dictionary)
	connector, connectorOk := c.Locals("connector").(*db.Connector)
	if !localeOk || !dictOk || !connectorOk {
		return api.handleServiceError(
			c,
			"Error getting locals for ValidateConnectorConfiguration",
			services.NewInternalError("error getting locals"),
			dict,
		)
	}

	// Parse JSON request body
	var req irmincore.ConnectorConfigurationRequest
	if err := c.Bind().JSON(&req); err != nil {
		api.Logger.Error("Error parsing JSON request", "error", err)
		return api.handleServiceError(c, "Failed to parse JSON request", services.ErrInvalidRequest, dict)
	}

	// Validate the configuration
	testResponse, err := api.Services.ValidateConnectorConfiguration(c, locale, connector, req)
	if err != nil {
		return api.handleServiceError(c, "Failed to validate connector configuration", err, dict)
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: testResponse,
	})
}
