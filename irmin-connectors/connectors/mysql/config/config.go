package config

import (
	"irmin-connectors/models"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// GetConnectorInfo returns the default connector information for MySQL.
func GetConnectorInfo() models.ConnectorDetails {
	return models.ConnectorDetails{
		Name:             "MySQL",
		Description:      "Import and export data from MySQL databases.",
		Version:          "0.1.0",
		StructureVersion: "1.0.0",
		Author:           "Tim Borovkov / Irmin",
		APIBaseURL:       "/mysql",
		LogoURL:          "/public/mysql.png",
		Capabilities: []irminmodels.ConnectorCapability{
			irminmodels.ConnectorCapabilityPullFullSync,
			irminmodels.ConnectorCapabilityPushFullSync,
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
