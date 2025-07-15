package config

import (
	"irmin-connectors/models"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// GetConnectorInfo returns the default connector information for PostgreSQL.
func GetConnectorInfo() models.ConnectorDetails {
	return models.ConnectorDetails{
		Name:             "PostgreSQL",
		Description:      "Import and export data from PostgreSQL databases.",
		Version:          "0.1.0",
		StructureVersion: "1.0.0",
		Author:           "Tim Borovkov / Irmin",
		APIBaseURL:       "/postgres",
		LogoURL:          "/public/postgres.png",
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
		ReadMoreURL:     "/postgres/details",
	}
}
