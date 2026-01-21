package config

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/models"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
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

// GetRequiredFields returns the mandatory form fields for HTTP.
func GetRequiredFields() []string {
	details, settings := initializeFieldDefinitions()
	return common.GetRequiredFieldNames(details, settings)
}

// GetOptionalFields returns the optional form fields for HTTP.
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
		"url": {
			Type:     "text",
			Label:    "URL",
			Example:  "https://api.example.com/v1/data",
			Required: true,
			HelpText: "The HTTP endpoint URL to connect to.",
		},
		"method": {
			Type:     "select",
			Label:    "HTTP Method",
			Example:  "GET",
			Required: true,
			HelpText: "The HTTP method to use for requests.",
			Options: common.CreateSelectOptionsWithLabels(map[string]string{
				"GET":    "GET",
				"POST":   "POST",
				"PUT":    "PUT",
				"PATCH":  "PATCH",
				"DELETE": "DELETE",
			}),
		},
		"headers": {
			Type:     "textarea",
			Label:    "Headers",
			Required: false,
			HelpText: "HTTP headers to include with requests (JSON object).",
			Example:  `{"Authorization": "Bearer token", "Content-Type": "application/json"}`,
			Secret:   true,
		},
		"body": {
			Type:     "textarea",
			Label:    "Request Body",
			Required: false,
			HelpText: "Request body content (for POST, PUT, PATCH methods).",
			Example:  `{"key": "value"}`,
		},
		"timeout": {
			Type:     "integer",
			Label:    "Timeout (seconds)",
			Required: false,
			Default:  "30",
			Min:      1,
			Max:      300, //nolint:mnd // Maximum timeout for HTTP requests
			HelpText: "Request timeout in seconds.",
		},
		"verify_ssl": {
			Type:     "select",
			Label:    "Verify SSL",
			Required: false,
			Default:  "true",
			HelpText: "Whether to verify SSL certificates.",
			Options: common.CreateSelectOptionsWithLabels(map[string]string{
				"true":  "Yes",
				"false": "No",
			}),
		},
		"accepted_status_codes": {
			Type:     "text",
			Label:    "Accepted Status Codes",
			Required: false,
			Default:  "200,201,202,203,204",
			HelpText: "Comma-separated list of HTTP status codes to treat as successful (e.g., 200,201,204).",
			Example:  "200,201,204",
		},
	}

	settingsFieldDefinitions := map[string]irminmodels.DynamicField{
		// No settings fields for HTTP connector - all configuration is in the URL
	}

	return detailsFieldDefinitions, settingsFieldDefinitions
}

// GetConnectorInfo returns the default connector information for HTTP.
func GetConnectorInfo() models.ConnectorDetails {
	return models.ConnectorDetails{
		Name:             "HTTP",
		Description:      "Generic HTTP connector for connecting to any HTTP endpoint.",
		Version:          "1.0.0",
		StructureVersion: "1.0.0",
		Author:           "Tim Borovkov / Irmin",
		APIBaseURL:       "/http",
		LogoURL:          "/public/http.png",
		Capabilities: []irminmodels.ConnectorCapability{
			irminmodels.ConnectorCapabilityPull,
			irminmodels.ConnectorCapabilityPush,
			irminmodels.ConnectorCapabilityApplyPatch,
		},
		Locales:         []string{"en"},
		PrimaryCategory: irminmodels.ConnectorCategoryOther,
		Categories:      []irminmodels.ConnectorCategory{irminmodels.ConnectorCategoryOther},
		AuthorEmail:     "hello@irmin.co",
		ReadMoreURL:     "/http/details",
	}
}
