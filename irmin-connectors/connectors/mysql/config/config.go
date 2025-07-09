package config

import "irmin-connectors/models"

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
		Capabilities:     []string{"pull", "push", "event"},
		Locales:          []string{"en"},
		PrimaryCategory:  "database",
		Categories:       []string{"database"},
		AuthorEmail:      "hello@irmin.co",
		ReadMoreURL:      "/mysql/details",
	}
}
