package config

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/models"
	"irmin-connectors/utils"
	"strconv"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

const (
	// DefaultPostgreSQLPort is the default PostgreSQL port number.
	DefaultPostgreSQLPort = 5432
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

// GetRequiredFields returns the mandatory form fields for PostgreSQL.
func GetRequiredFields() []string {
	details, settings := initializeFieldDefinitions()
	return common.GetRequiredFieldNames(details, settings)
}

// GetOptionalFields returns the optional form fields for PostgreSQL.
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
			HelpText: "The hostname or IP address of the PostgreSQL server.",
		},
		"port": {
			Type:     "integer",
			Label:    "Port",
			Example:  strconv.Itoa(DefaultPostgreSQLPort),
			Required: true,
			HelpText: "The port number on which PostgreSQL is listening.",
			Min:      1,
			Max:      utils.MaxPortNumber,
		},
		"username": {
			Type:     "text",
			Label:    "Username",
			Example:  "postgres",
			Required: true,
			HelpText: "The user name for connecting to the PostgreSQL database.",
		},
		"password": {
			Type:     "password",
			Label:    "Password",
			Required: true,
			HelpText: "The password for the specified PostgreSQL user.",
			Secret:   true,
		},
		"default_db": {
			Type:     "text",
			Label:    "Default Database",
			Example:  "postgres",
			Required: false,
			HelpText: "The default database to connect to (optional).",
		},
		"ssl_mode": {
			Type:     "select",
			Label:    "SSL Mode",
			Required: true,
			HelpText: "Enable or disable SSL mode for the connection.",
			Options: common.CreateSelectOptionsWithLabels(map[string]string{
				"true":  "Enabled",
				"false": "Disabled",
			}),
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

// GetConnectorInfo returns the default connector information for PostgreSQL.
func GetConnectorInfo() models.ConnectorDetails {
	return models.ConnectorDetails{
		Name:             "PostgreSQL",
		Description:      "Import and export data from PostgreSQL databases.",
		Version:          "1.0.0",
		StructureVersion: "1.0.0",
		Author:           "Tim Borovkov / Irmin",
		APIBaseURL:       "/postgres",
		LogoURL:          "/public/postgres.png",
		Capabilities: []irminmodels.ConnectorCapability{
			irminmodels.ConnectorCapabilityPull,
			irminmodels.ConnectorCapabilityPush,
			irminmodels.ConnectorCapabilityApplyPatch,
			irminmodels.ConnectorCapabilityPatchEvent,
		},
		Locales:         []string{"en"},
		PrimaryCategory: irminmodels.ConnectorCategoryDatabase,
		Categories:      []irminmodels.ConnectorCategory{irminmodels.ConnectorCategoryDatabase},
		AuthorEmail:     "hello@irmin.co",
		ReadMoreURL:     "/postgres/details",
	}
}
