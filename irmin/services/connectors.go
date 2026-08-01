package services

import (
	"context"
	"errors"
	"irmin-api/db"
	"irmin-api/utils"

	"github.com/IrminData/irmin-platform/sdks/go/connectorsclient"

	irmincore "github.com/IrminData/irmin-platform/sdks/go/api"
	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"
	"gorm.io/gorm"
)

func (api *APIServices) ListConnectors(c context.Context) ([]db.Connector, error) {
	// This is a public service, so anyone can technically use it

	// Get all connectors from the database
	connectors, getAllConnectorsErr := api.DB.GetAllConnectors()
	if getAllConnectorsErr != nil {
		api.Logger.ErrorContext(c, "Error retrieving connectors", "error", getAllConnectorsErr)
		return nil, NewInternalErrorf("error retrieving connectors: %w", getAllConnectorsErr)
	}

	return connectors, nil
}

func (api *APIServices) GetConnector(c context.Context, connectorID uint) (*db.Connector, error) {
	// This is a public service, so anyone can technically use it

	// Get the connector from the database
	connector, getConnectorErr := api.DB.GetConnector(connectorID)
	if getConnectorErr != nil {
		api.Logger.ErrorContext(c, "Error retrieving connector", "error", getConnectorErr)
		return nil, NewInternalErrorf("error retrieving connector: %w", getConnectorErr)
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
	connector.PrimaryCategory = string(connectorInfo.PrimaryCategory)
	connector.Categories = utils.ConvertToStringSlice(connectorInfo.Categories)
	connector.AuthorEmail = connectorInfo.AuthorEmail
	connector.ReadMoreURL = connectorInfo.ReadMoreURL
	connector.ConnectionOAuthConfig = connectorInfo.ConnectionOAuthConfig
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
	connectorClient := connectorsclient.NewClient(req.URL, req.SystemToken)

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
	// Only overwrite a previously cached schema if the fresh fetch succeeded
	// on both sides; a partial failure would otherwise wipe good cached data.
	if schema, complete := api.fetchConnectorSchema(c, connectorClient, connector.Name); complete {
		connector.Schema = schema
	}
	saveConnectorErr := api.DB.Save(connector).Error
	if saveConnectorErr != nil {
		api.Logger.ErrorContext(c, "Error updating connector", "error", saveConnectorErr)
		return nil, NewInternalErrorf("error updating connector: %w", saveConnectorErr)
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
	connectorClient := connectorsclient.NewClient(req.URL, req.SystemToken)

	// Request the info endpoint of the connector
	connectorInfo, getInfoErr := connectorClient.GetInfo(c)
	if getInfoErr != nil {
		api.Logger.ErrorContext(c, "Error fetching connector info", "error", getInfoErr)
		return nil, getInfoErr
	}

	// Update the connector
	api.updateConnectorFromInfo(connector, req, *connectorInfo)
	// Only overwrite a previously cached schema if the fresh fetch succeeded
	// on both sides; a partial failure would otherwise wipe good cached data.
	if schema, complete := api.fetchConnectorSchema(c, connectorClient, connector.Name); complete {
		connector.Schema = schema
	}
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
		return NewInternalErrorf("error deleting connector: %w", deleteConnectorErr)
	}

	return nil
}

// fetchConnectorSchema fetches the static details + settings field schemas
// from a connector (no overrides applied) and returns them merged into a
// single map keyed as "details.<field>" / "settings.<field>". Used to cache
// the schema on the Connector row at register/update time so the list path
// doesn't have to fan out on every read.
//
// The second return value reports whether the fetch was complete — both
// sides responded without error. A connector that genuinely declares zero
// fields returns an empty map with complete=true, which callers should
// still cache to avoid a permanent fan-out loop. complete=false means a
// transient error on at least one side; callers should retry later
// instead of caching a partial/empty result.
func (api *APIServices) fetchConnectorSchema(
	c context.Context,
	client *connectorsclient.Client,
	connectorName string,
) (map[string]irminmodels.DynamicField, bool) {
	merged := make(map[string]irminmodels.DynamicField)
	complete := true

	detailsFields, err := client.GetConfigFields(c, "details", nil, nil)
	if err != nil {
		api.Logger.ErrorContext(c, "Error fetching details fields", "connector", connectorName, "error", err)
		complete = false
	} else {
		for k, v := range detailsFields {
			merged["details."+k] = v
		}
	}

	settingsFields, err := client.GetConfigFields(c, "settings", nil, nil)
	if err != nil {
		api.Logger.ErrorContext(c, "Error fetching settings fields", "connector", connectorName, "error", err)
		complete = false
	} else {
		for k, v := range settingsFields {
			merged["settings."+k] = v
		}
	}

	return merged, complete
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
	connectorClient := connectorsclient.NewClient(connector.APIBaseURL, connector.SystemToken)

	// Get the connection settings
	configurationFields, getConfigFieldsErr := connectorClient.GetConfigFields(
		c,
		configurationType,
		detailsStr,
		settingsStr,
	)
	if getConfigFieldsErr != nil {
		api.Logger.ErrorContext(c, "Error fetching connection configuration fields", "error", getConfigFieldsErr)
		return nil, NewInternalErrorf("error fetching connection configuration fields: %w", getConfigFieldsErr)
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
	connectorClient := connectorsclient.NewClient(connector.APIBaseURL, connector.SystemToken)

	// Test the connection
	testResponse, validateConfigFieldsErr := connectorClient.ValidateConfigFields(c, detailsStr, settingsStr)
	if validateConfigFieldsErr != nil && testResponse == nil {
		api.Logger.ErrorContext(c, "Error testing connection", "error", validateConfigFieldsErr)
		return nil, NewInternalErrorf("error testing connection: %w", validateConfigFieldsErr)
	}

	return testResponse, nil
}
