package controllers

import (
	"errors"
	irmincache "irmin-api/cache"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/utils"

	irminconnectorclient "github.com/IrminData/irmin-sdk-go/connector"
	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
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
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get all connectors from the database
	connectors, getAllConnectorsErr := api.DB.GetAllConnectors()
	if getAllConnectorsErr != nil {
		api.Logger.Error("Error retrieving connectors", "error", getAllConnectorsErr, "connectors", connectors)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Structure the response.
	connectorsResponse, formatErr := formatter.FormatIndexResponse(
		connectors,
		formatter.FormatConnectorResponse,
		api.SQIDManager,
	)
	if formatErr != nil {
		api.Logger.Error("Error formatting connectors", "error", formatErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
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
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Create the response
	connectorResponse, formatConnectorResponseErr := formatter.FormatConnectorResponse(connector, api.SQIDManager)
	if formatConnectorResponseErr != nil {
		api.Logger.Error(
			"Error formatting connector response",
			"error",
			formatConnectorResponseErr,
			"connector",
			connector.ID,
		)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
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
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Only system requests can create connectors
	if !isSystem {
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{"access_denied"},
		})
	}

	// Parse JSON request body
	var req irmincore.ConnectorRequest
	if validationErr := api.validateAndBindRequestWithResponse(c, &req, dict); validationErr != nil {
		return validationErr
	}

	// Create new connector client
	connectorClient := irminconnectorclient.NewClient(req.URL, req.SystemToken, locale)

	// Request the info endpoint of the connector
	connectorInfo, getInfoErr := connectorClient.GetInfo()
	if getInfoErr != nil {
		api.Logger.Error("Error fetching connector info", "error", getInfoErr, "url", req.URL)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Check if the connector is already registered
	var connector *db.Connector
	var getConnectorErr error

	// First, try to find the connector by the self-reported URL
	if connectorInfo.APIBaseURL != "" {
		connector, getConnectorErr = api.DB.GetConnectorByAPIBaseURL(connectorInfo.APIBaseURL)
		if getConnectorErr != nil && !errors.Is(getConnectorErr, gorm.ErrRecordNotFound) {
			api.Logger.Warn("Error getting connector by self-reported API base URL", "error", getConnectorErr)
		}
	}

	// If not found, try with the request URL
	if connector == nil {
		connector, getConnectorErr = api.DB.GetConnectorByAPIBaseURL(req.URL)
		if getConnectorErr != nil && !errors.Is(getConnectorErr, gorm.ErrRecordNotFound) {
			api.Logger.Warn("Error getting connector by request URL", "error", getConnectorErr)
		}
	}

	if connector == nil {
		connector = &db.Connector{}
	}

	api.updateConnectorFromInfo(connector, req, *connectorInfo)
	saveConnectorErr := api.DB.Save(&connector).Error
	if saveConnectorErr != nil {
		api.Logger.Error("Error updating connector", "error", saveConnectorErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Create the response
	connectorResponse, formatConnectorResponseErr := formatter.FormatConnectorResponse(connector, api.SQIDManager)
	if formatConnectorResponseErr != nil {
		api.Logger.Error("Error formatting connector response", "error", formatConnectorResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate caches affected by this action (all users)
	if err := irmincache.InvalidatePathPrefixForAllUsers(api.cacheStorage, "/api/v1/connectors"); err != nil {
		api.Logger.Error("Error invalidating cache", "error", err)
	}

	// Return the connector info
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "connector_refreshed"),
		Data:    connectorResponse,
	})
}

func (api *APIControllers) updateConnectorFromInfo(
	connector *db.Connector,
	req irmincore.ConnectorRequest,
	connectorInfo irminconnectorclient.ConnectorInfo,
) {
	connector.APIBaseURL = connectorInfo.APIBaseURL
	connector.SystemToken = req.SystemToken
	connector.Name = connectorInfo.Name
	connector.Description = connectorInfo.Description
	connector.Version = connectorInfo.Version
	connector.StructureVersion = connectorInfo.StructureVersion
	connector.Author = connectorInfo.Author
	connector.LogoURL = connectorInfo.LogoURL
	connector.Capabilities = connectorInfo.Capabilities
	connector.Locales = connectorInfo.Locales
	connector.PrimaryCategory = connectorInfo.PrimaryCategory
	connector.Categories = connectorInfo.Categories
	connector.AuthorEmail = connectorInfo.AuthorEmail
	connector.ReadMoreURL = connectorInfo.ReadMoreURL
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
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Only system requests can update connectors
	if !isSystem {
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{"access_denied"},
		})
	}

	// Parse JSON request body
	var req irmincore.ConnectorRequest
	if err := c.Bind().JSON(&req); err != nil {
		api.Logger.Error("Error parsing JSON request", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Validate required fields
	if req.URL == "" || req.SystemToken == "" {
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Create new connector client
	connectorClient := irminconnectorclient.NewClient(req.URL, req.SystemToken, locale)

	// Request the info endpoint of the connector
	connectorInfo, getInfoErr := connectorClient.GetInfo()
	if getInfoErr != nil {
		api.Logger.Error("Error fetching connector info", "error", getInfoErr)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Update the connector
	api.updateConnectorFromInfo(connector, req, *connectorInfo)
	saveConnectorErr := api.DB.Save(connector).Error
	if saveConnectorErr != nil {
		api.Logger.Error("Error updating connector", "error", saveConnectorErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Create the response
	connectorResponse, formatConnectorResponseErr := formatter.FormatConnectorResponse(connector, api.SQIDManager)
	if formatConnectorResponseErr != nil {
		api.Logger.Error("Error formatting connector response", "error", formatConnectorResponseErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate caches affected by this action (all users)
	if err := irmincache.InvalidatePathPrefixForAllUsers(api.cacheStorage, "/api/v1/connectors"); err != nil {
		api.Logger.Error("Error invalidating cache", "error", err)
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
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Only system requests can delete connectors
	if !isSystem {
		return utils.WriteResponse(c, fiber.StatusForbidden, irminmodels.IrminAPIResponse{
			Errors: []string{"access_denied"},
		})
	}

	// Delete the connector from the database
	deleteConnectorErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return api.DB.DeleteConnector(tx, connector.ID)
	})
	if deleteConnectorErr != nil {
		api.Logger.Error("Error deleting connector", "error", deleteConnectorErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Invalidate caches affected by this action (all users)
	if err := irmincache.InvalidatePathPrefixForAllUsers(api.cacheStorage, "/api/v1/connectors"); err != nil {
		api.Logger.Error("Error invalidating cache", "error", err)
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
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Get the type of the configuration fields to fetch
	configurationType := c.Params("type")
	if configurationType == "" {
		api.Logger.Error("Error fetching connection settings fields: configuration type is required")
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Parse JSON request body
	var req irmincore.ConnectorConfigurationRequest
	if err := c.Bind().JSON(&req); err != nil {
		api.Logger.Error("Error parsing JSON request", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Convert any maps to string maps for compatibility with connector client
	detailsStr := utils.ConvertToStringMap(req.Details)
	settingsStr := utils.ConvertToStringMap(req.Settings)

	// Create new connector client
	connectorClient := irminconnectorclient.NewClient(connector.APIBaseURL, connector.SystemToken, locale)

	// Get the connection settings
	configurationFields, getConfigFieldsErr := connectorClient.GetConfigFields(
		configurationType,
		detailsStr,
		settingsStr,
	)
	if getConfigFieldsErr != nil {
		api.Logger.Error("Error fetching connection configuration fields", "error", getConfigFieldsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
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
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{})
	}

	// Parse JSON request body
	var req irmincore.ConnectorConfigurationRequest
	if err := c.Bind().JSON(&req); err != nil {
		api.Logger.Error("Error parsing JSON request", "error", err)
		return utils.WriteResponse(c, fiber.StatusBadRequest, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "invalid_request")},
		})
	}

	// Convert any maps to string maps for compatibility with connector client
	detailsStr := utils.ConvertToStringMap(req.Details)
	settingsStr := utils.ConvertToStringMap(req.Settings)

	// Create new connector client
	connectorClient := irminconnectorclient.NewClient(connector.APIBaseURL, connector.SystemToken, locale)

	// Test the connection
	testResponse, validateConfigFieldsErr := connectorClient.ValidateConfigFields(detailsStr, settingsStr)
	if validateConfigFieldsErr != nil && testResponse == nil {
		api.Logger.Error("Error testing connection", "error", validateConfigFieldsErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the response.
	return api.validateAndWriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: testResponse,
	})
}
