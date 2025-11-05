package services

import (
	"context"
	"errors"
	connectorsclient "irmin-api/connectors-client"
	"irmin-api/db"
	"irmin-api/utils"

	irmincore "github.com/IrminData/irmin-sdk-go/api"
	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"gorm.io/gorm"
)

func (api *APIServices) ListConnectors(c context.Context) ([]db.Connector, error) {
	// This is a public service, so anyone can technically use it

	// Get all connectors from the database
	connectors, getAllConnectorsErr := api.DB.GetAllConnectors()
	if getAllConnectorsErr != nil {
		api.Logger.ErrorContext(c, "Error retrieving connectors", "error", getAllConnectorsErr)
		return nil, getAllConnectorsErr
	}

	return connectors, nil
}

func (api *APIServices) GetConnector(c context.Context, connectorID uint) (*db.Connector, error) {
	// This is a public service, so anyone can technically use it

	// Get the connector from the database
	connector, getConnectorErr := api.DB.GetConnector(connectorID)
	if getConnectorErr != nil {
		api.Logger.ErrorContext(c, "Error retrieving connector", "error", getConnectorErr)
		return nil, getConnectorErr
	}

	return connector, nil
}

func (api *APIServices) updateConnectorFromInfo(
	connector *db.Connector,
	req irmincore.ConnectorRequest,
	connectorInfo connectorsclient.ConnectorInfo,
) {
	connector.APIBaseURL = connectorInfo.APIBaseURL
	connector.SystemToken = req.SystemToken
	connector.Name = connectorInfo.Name
	connector.Description = connectorInfo.Description
	connector.Version = connectorInfo.Version
	connector.StructureVersion = connectorInfo.StructureVersion
	connector.Author = connectorInfo.Author
	connector.LogoURL = connectorInfo.LogoURL
	connector.Capabilities = utils.ConvertToStringSlice(connectorInfo.Capabilities)
	connector.Locales = connectorInfo.Locales
	connector.PrimaryCategory = string(connectorInfo.PrimaryCategory)
	connector.Categories = utils.ConvertToStringSlice(connectorInfo.Categories)
	connector.AuthorEmail = connectorInfo.AuthorEmail
	connector.ReadMoreURL = connectorInfo.ReadMoreURL
}

func (api *APIServices) CreateConnector(
	c context.Context,
	locale string,
	isSystem bool,
	req irmincore.ConnectorRequest,
) (*db.Connector, error) {
	// Only the system user can create connectors
	if !isSystem {
		return nil, ErrSystemUserRequired
	}

	// Validate required fields
	if req.URL == "" || req.SystemToken == "" {
		return nil, ErrURLAndSystemTokenRequiredForConnectors
	}

	// Create new connector client
	connectorClient := connectorsclient.NewClient(req.URL, req.SystemToken, locale)

	// Request the info endpoint of the connector
	connectorInfo, getInfoErr := connectorClient.GetInfo(c)
	if getInfoErr != nil {
		api.Logger.ErrorContext(c, "Error fetching connector info", "error", getInfoErr, "url", req.URL)
		return nil, getInfoErr
	}

	// Check if the connector is already registered
	var connector *db.Connector
	var getConnectorErr error

	// First, try to find the connector by the self-reported URL
	if connectorInfo.APIBaseURL != "" {
		connector, getConnectorErr = api.DB.GetConnectorByAPIBaseURL(connectorInfo.APIBaseURL)
		if getConnectorErr != nil && !errors.Is(getConnectorErr, gorm.ErrRecordNotFound) {
			api.Logger.WarnContext(c, "Error getting connector by self-reported API base URL", "error", getConnectorErr)
		}
	}

	// If not found, try with the request URL
	if connector == nil {
		connector, getConnectorErr = api.DB.GetConnectorByAPIBaseURL(req.URL)
		if getConnectorErr != nil && !errors.Is(getConnectorErr, gorm.ErrRecordNotFound) {
			api.Logger.WarnContext(c, "Error getting connector by request URL", "error", getConnectorErr)
		}
	}

	if connector == nil {
		connector = &db.Connector{}
	}

	api.updateConnectorFromInfo(connector, req, *connectorInfo)
	saveConnectorErr := api.DB.Save(connector).Error
	if saveConnectorErr != nil {
		api.Logger.ErrorContext(c, "Error updating connector", "error", saveConnectorErr)
		return nil, saveConnectorErr
	}

	return connector, nil
}

func (api *APIServices) UpdateConnector(
	c context.Context,
	locale string,
	isSystem bool,
	connector *db.Connector,
	req irmincore.ConnectorRequest,
) (*db.Connector, error) {
	// Only the system user can update connectors
	if !isSystem {
		return nil, ErrSystemUserRequired
	}

	// Validate required fields
	if req.URL == "" || req.SystemToken == "" {
		return nil, ErrURLAndSystemTokenRequiredForConnectors
	}

	// Create new connector client
	connectorClient := connectorsclient.NewClient(req.URL, req.SystemToken, locale)

	// Request the info endpoint of the connector
	connectorInfo, getInfoErr := connectorClient.GetInfo(c)
	if getInfoErr != nil {
		api.Logger.ErrorContext(c, "Error fetching connector info", "error", getInfoErr)
		return nil, getInfoErr
	}

	// Update the connector
	api.updateConnectorFromInfo(connector, req, *connectorInfo)
	saveConnectorErr := api.DB.Save(connector).Error
	if saveConnectorErr != nil {
		api.Logger.ErrorContext(c, "Error updating connector", "error", saveConnectorErr)
		return nil, saveConnectorErr
	}

	return connector, nil
}

func (api *APIServices) DeleteConnector(c context.Context, connector *db.Connector, isSystem bool) error {
	// Only the system user can delete connectors
	if !isSystem {
		return ErrSystemUserRequired
	}

	// Delete the connector from the database
	deleteConnectorErr := api.DB.Transaction(func(tx *gorm.DB) error {
		return api.DB.DeleteConnector(tx, connector.ID)
	})
	if deleteConnectorErr != nil {
		api.Logger.ErrorContext(c, "Error deleting connector", "error", deleteConnectorErr)
		return deleteConnectorErr
	}

	return nil
}

func (api *APIServices) GetConnectorConfigurationFields(
	c context.Context,
	locale string,
	connector *db.Connector,
	configurationType string,
	req irmincore.ConnectorConfigurationRequest,
) (map[string]irminmodels.DynamicField, error) {
	// This is a public service, so anyone can technically use it

	// Convert any maps to string maps for compatibility with connector client
	detailsStr := utils.ConvertToStringMap(req.Details)
	settingsStr := utils.ConvertToStringMap(req.Settings)

	// Create new connector client
	connectorClient := connectorsclient.NewClient(connector.APIBaseURL, connector.SystemToken, locale)

	// Get the connection settings
	configurationFields, getConfigFieldsErr := connectorClient.GetConfigFields(
		c,
		configurationType,
		detailsStr,
		settingsStr,
	)
	if getConfigFieldsErr != nil {
		api.Logger.ErrorContext(c, "Error fetching connection configuration fields", "error", getConfigFieldsErr)
		return nil, getConfigFieldsErr
	}

	return configurationFields, nil
}

func (api *APIServices) ValidateConnectorConfiguration(
	c context.Context,
	locale string,
	connector *db.Connector,
	req irmincore.ConnectorConfigurationRequest,
) (*irminmodels.ConnectorConfigurationValidationResult, error) {
	// This is a public service, so anyone can technically use it

	// Convert any maps to string maps for compatibility with connector client
	detailsStr := utils.ConvertToStringMap(req.Details)
	settingsStr := utils.ConvertToStringMap(req.Settings)

	// Create new connector client
	connectorClient := connectorsclient.NewClient(connector.APIBaseURL, connector.SystemToken, locale)

	// Test the connection
	testResponse, validateConfigFieldsErr := connectorClient.ValidateConfigFields(c, detailsStr, settingsStr)
	if validateConfigFieldsErr != nil && testResponse == nil {
		api.Logger.ErrorContext(c, "Error testing connection", "error", validateConfigFieldsErr)
		return nil, validateConfigFieldsErr
	}

	return testResponse, nil
}
