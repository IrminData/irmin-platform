package config

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/models"
	"irmin-connectors/utils"
	"strconv"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

const (
	// DefaultMySQLPort is the default MySQL port number.
	DefaultMySQLPort = 3306
)

// GetDetailsFieldDefinitions returns all detail fields with their metadata.
func GetDetailsFieldDefinitions() map[string]irminmodels.DynamicField {
	details, _ := initializeFieldDefinitions()
	return details
}

// GetSettingsFieldDefinitions returns static settings fields (dynamic ones are handled in controllers).
func GetSettingsFieldDefinitions() map[string]irminmodels.DynamicField {
	_, settings := initializeFieldDefinitions()
	return settings
}

// GetRequiredFields returns the mandatory form fields for MySQL.
func GetRequiredFields() []string {
	details, settings := initializeFieldDefinitions()
	return common.GetRequiredFieldNames(details, settings)
}

// GetOptionalFields returns the optional form fields for MySQL.
func GetOptionalFields() []string {
	details, settings := initializeFieldDefinitions()
	return common.GetOptionalFieldNames(details, settings)
}

// GetDetailsFields returns the detail-specific fields.
func GetDetailsFields() []string {
	details, _ := initializeFieldDefinitions()
	return common.GetDetailsFieldNames(details)
}

// GetSettingsFields returns the settings-specific fields.
func GetSettingsFields() []string {
	_, settings := initializeFieldDefinitions()
	return common.GetSettingsFieldNames(settings)
}

func initializeFieldDefinitions() (map[string]irminmodels.DynamicField, map[string]irminmodels.DynamicField) {
	detailsFieldDefinitions := map[string]irminmodels.DynamicField{
		"host": {
			Type:     "text",
			Label:    "Host",
			Example:  "localhost",
			Required: true,
			HelpText: "The hostname or IP address of the MySQL server.",
		},
		"port": {
			Type:     "integer",
			Label:    "Port",
			Example:  strconv.Itoa(DefaultMySQLPort),
			Required: true,
			HelpText: "The port number on which MySQL is listening.",
			Min:      1,
			Max:      utils.MaxPortNumber,
		},
		"username": {
			Type:     "text",
			Label:    "Username",
			Example:  "root",
			Required: true,
			HelpText: "The user name for connecting to the MySQL database.",
		},
		"password": {
			Type:     "password",
			Label:    "Password",
			Required: true,
			HelpText: "The password for the specified MySQL user.",
			Secret:   true,
		},
		"default_db": {
			Type:     "text",
			Label:    "Default Database",
			Example:  "mysql",
			Required: false,
			HelpText: "The default database to connect to (optional).",
		},
	}

	settingsFieldDefinitions := map[string]irminmodels.DynamicField{
		"database": {
			Type:     "text",
			Label:    "Database Name",
			Example:  "my_database",
			Required: true,
			HelpText: "The name of the database you want to connect to.",
			// Note: This will be converted to a select field with dynamic options in configFields.go
		},
	}

	return detailsFieldDefinitions, settingsFieldDefinitions
}

// GetConnectorInfo returns the default connector information for MySQL.
func GetConnectorInfo() models.ConnectorDetails {
	return models.ConnectorDetails{
		Name:             "MySQL",
		Description:      "Import and export data from MySQL databases.",
		Version:          "1.0.0",
		StructureVersion: "1.0.0",
		Author:           "Tim Borovkov / Irmin",
		APIBaseURL:       "/mysql",
		LogoURL:          "/public/mysql.png",
		Capabilities: []irminmodels.ConnectorCapability{
			irminmodels.ConnectorCapabilityPull,
			irminmodels.ConnectorCapabilityPush,
			irminmodels.ConnectorCapabilityPushPatch,
			irminmodels.ConnectorCapabilityEventWebhook,
		},
		Locales:         []string{"en"},
		PrimaryCategory: irminmodels.ConnectorCategoryDatabase,
		Categories:      []irminmodels.ConnectorCategory{irminmodels.ConnectorCategoryDatabase},
		AuthorEmail:     "hello@irmin.co",
		ReadMoreURL:     "/mysql/details",
	}
}
