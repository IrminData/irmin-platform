package config

import (
	"irmin-connectors/models"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

const (
	// DefaultPort is the default SFTP port number.
	DefaultPort = 22
	// DefaultMaxHostnameLen is the default maximum hostname length.
	DefaultMaxHostnameLen = 255
	// DefaultMaxUsernameLen is the default maximum username length.
	DefaultMaxUsernameLen = 100
	// MaxPortNumber is the maximum valid port number.
	MaxPortNumber = 65535
)

// GetConnectorInfo returns the connector information for SFTP.
func GetConnectorInfo() models.ConnectorDetails {
	return models.ConnectorDetails{
		Name:             "SFTP",
		Description:      "Secure File Transfer Protocol connector for file operations",
		Version:          "1.0.0",
		StructureVersion: "1.0.0",
		Author:           "Irmin",
		APIBaseURL:       "/sftp",
		LogoURL:          "/public/sftp.png",
		Capabilities: []irminmodels.ConnectorCapability{
			irminmodels.ConnectorCapabilityPull, // Download files from SFTP server
			irminmodels.ConnectorCapabilityPush, // Upload files to SFTP server
			// Note: SFTP doesn't support patch operations or webhooks
		},
		Locales:         []string{"en"},
		PrimaryCategory: irminmodels.ConnectorCategoryOther,
		Categories:      []irminmodels.ConnectorCategory{irminmodels.ConnectorCategoryOther},
		AuthorEmail:     "hello@irmin.co",
		ReadMoreURL:     "/sftp/details",
	}
}
