package config

import "irmin-connectors/models"

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
		Capabilities:     []string{"pull", "push", "event"},
		Locales:          []string{"en"},
		PrimaryCategory:  "database",
		Categories:       []string{"database"},
		AuthorEmail:      "hello@irmin.co",
		ReadMoreURL:      "/postgres/details",
	}
}
