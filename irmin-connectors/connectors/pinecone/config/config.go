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

// GetSettingsFieldDefinitions returns settings fields.
func GetSettingsFieldDefinitions() map[string]irminmodels.DynamicField {
	_, settings := initializeFieldDefinitions()
	return settings
}

// GetRequiredFields returns the mandatory form fields for Pinecone.
func GetRequiredFields() []string {
	details, settings := initializeFieldDefinitions()
	return common.GetRequiredFieldNames(details, settings)
}

// GetOptionalFields returns the optional form fields for Pinecone.
func GetOptionalFields() []string {
	details, settings := initializeFieldDefinitions()
	return common.GetOptionalFieldNames(details, settings)
}

// GetDetailsFields returns the detail-specific fields.
func GetDetailsFields() []string {
	details, _ := initializeFieldDefinitions()
	return common.GetDetailsFieldNames(details)
}

// GetRequiredDetailsFields returns only the required detail-specific fields.
func GetRequiredDetailsFields() []string {
	details, _ := initializeFieldDefinitions()
	return common.GetRequiredDetailsFieldNames(details)
}

// GetSettingsFields returns the settings-specific fields.
func GetSettingsFields() []string {
	_, settings := initializeFieldDefinitions()
	return common.GetSettingsFieldNames(settings)
}

// GetRequiredSettingsFields returns only the required settings-specific fields.
func GetRequiredSettingsFields() []string {
	_, settings := initializeFieldDefinitions()
	return common.GetRequiredSettingsFieldNames(settings)
}

func initializeFieldDefinitions() (map[string]irminmodels.DynamicField, map[string]irminmodels.DynamicField) {
	detailsFieldDefinitions := map[string]irminmodels.DynamicField{
		"api_key": {
			Type:     "password",
			Label:    "API Key",
			Required: true,
			HelpText: "Your Pinecone API key. You can find this in your Pinecone console.",
			Secret:   true,
		},
	}

	settingsFieldDefinitions := map[string]irminmodels.DynamicField{
		"host": {
			Type:     "text",
			Label:    "Index Host",
			Example:  "index-name-abc123.svc.us-east-1.pinecone.io",
			Required: true,
			HelpText: "The host URL for your Pinecone index. Found in the Pinecone console under your index details.",
		},
		"namespace": {
			Type:     "text",
			Label:    "Namespace",
			Example:  "default",
			Required: false,
			HelpText: "Optional namespace to target within the index. Leave empty to use the default namespace.",
		},
	}

	return detailsFieldDefinitions, settingsFieldDefinitions
}

// GetConnectorInfo returns the default connector information for Pinecone.
func GetConnectorInfo() models.ConnectorDetails {
	return models.ConnectorDetails{
		Name:             "Pinecone",
		Description:      "Import and export vector embeddings from Pinecone vector database.",
		Version:          "1.0.0",
		StructureVersion: "1.0.0",
		Author:           "Tim Borovkov / Irmin",
		APIBaseURL:       "/pinecone",
		LogoURL:          "/public/pinecone.png",
		Capabilities: []irminmodels.ConnectorCapability{
			irminmodels.ConnectorCapabilityPull,
			irminmodels.ConnectorCapabilityPush,
			irminmodels.ConnectorCapabilityApplyPatch,
		},
		PrimaryCategory: irminmodels.ConnectorCategoryDatabase,
		Categories: []irminmodels.ConnectorCategory{
			irminmodels.ConnectorCategoryDatabase,
			irminmodels.ConnectorCategoryAnalytics,
			irminmodels.ConnectorCategoryStorage,
		},
		AuthorEmail: "hello@irmin.co",
		ReadMoreURL: "/pinecone/details",
	}
}
