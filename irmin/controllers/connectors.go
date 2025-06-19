package controllers

import (
	"fmt"
	"irmin-api/db"
	"irmin-api/formatter"
	"irmin-api/locales"
	"irmin-api/utils"

	irminconnectorclient "github.com/IrminData/irmin-sdk-go/connector"
	irmincore "github.com/IrminData/irmin-sdk-go/core-api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/gofiber/fiber/v3"
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
	connector, getConnectorByAPIBaseURLErr := api.DB.GetConnectorByAPIBaseURL(connectorInfo.APIBaseURL)
	if getConnectorByAPIBaseURLErr != nil {
		api.Logger.Error("Error getting connector by API base URL", "error", getConnectorByAPIBaseURLErr)
	}
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
	connector.APIBaseURL = req.URL
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
	detailsStr := make(map[string]string)
	for k, v := range req.Details {
		if str, ok := v.(string); ok {
			detailsStr[k] = str
		} else {
			detailsStr[k] = fmt.Sprintf("%v", v)
		}
	}

	settingsStr := make(map[string]string)
	for k, v := range req.Settings {
		if str, ok := v.(string); ok {
			settingsStr[k] = str
		} else {
			settingsStr[k] = fmt.Sprintf("%v", v)
		}
	}

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
	detailsStr := make(map[string]string)
	for k, v := range req.Details {
		if str, ok := v.(string); ok {
			detailsStr[k] = str
		} else {
			detailsStr[k] = fmt.Sprintf("%v", v)
		}
	}

	settingsStr := make(map[string]string)
	for k, v := range req.Settings {
		if str, ok := v.(string); ok {
			settingsStr[k] = str
		} else {
			settingsStr[k] = fmt.Sprintf("%v", v)
		}
	}

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
