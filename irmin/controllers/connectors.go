package controllers

import (
	"errors"
	"fmt"
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
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: connectorsResponse,
	})
}

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
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: connectorResponse,
	})
}

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

	// Return the connector info
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
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

	// Return the connector info
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "connector_refreshed"),
		Data:    connectorResponse,
	})
}

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
	deleteConnectorErr := api.DB.DeleteConnector(connector.ID)
	if deleteConnectorErr != nil {
		api.Logger.Error("Error deleting connector", "error", deleteConnectorErr)
		return utils.WriteResponse(c, fiber.StatusInternalServerError, irminmodels.IrminAPIResponse{
			Errors: []string{api.lm.T(dict, "error_occurred")},
		})
	}

	// Return the success response
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Message: api.lm.T(dict, "connector_deleted"),
	})
}

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
	detailsStr := convertMapToMapString(req.Details)
	settingsStr := convertMapToMapString(req.Settings)

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
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: configurationFields,
	})
}

func convertMapToMapString(m map[string]any) map[string]string {
	res := make(map[string]string)
	for k, v := range m {
		if str, ok := v.(string); ok {
			res[k] = str
		} else {
			res[k] = fmt.Sprintf("%v", v)
		}
	}
	return res
}

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
	detailsStr := convertMapToMapString(req.Details)
	settingsStr := convertMapToMapString(req.Settings)

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
	return utils.WriteResponse(c, fiber.StatusOK, irminmodels.IrminAPIResponse{
		Data: testResponse,
	})
}
