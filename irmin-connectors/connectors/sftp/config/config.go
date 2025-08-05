package config

import (
	"irmin-connectors/connectors/common"
	"irmin-connectors/models"
	"strconv"

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

// GetDetailsFieldDefinitions returns all detail fields with their metadata.
func GetDetailsFieldDefinitions() map[string]irminmodels.DynamicField {
	details, _ := initializeFieldDefinitions()
	return details
}

// GetSettingsFieldDefinitions returns all settings fields with their metadata.
func GetSettingsFieldDefinitions() map[string]irminmodels.DynamicField {
	_, settings := initializeFieldDefinitions()
	return settings
}

// GetRequiredFields returns the mandatory form fields for SFTP.
func GetRequiredFields() []string {
	details, settings := initializeFieldDefinitions()
	return common.GetRequiredFieldNames(details, settings)
}

// GetOptionalFields returns the optional form fields for SFTP.
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
			HelpText: "SFTP server hostname or IP address",
			Required: true,
			Example:  "sftp.example.com",
		},
		"port": {
			Type:     "integer",
			Label:    "Port",
			HelpText: "SFTP server port",
			Required: false,
			Default:  strconv.Itoa(DefaultPort),
			Min:      1,
			Max:      MaxPortNumber,
		},
		"username": {
			Type:     "text",
			Label:    "Username",
			HelpText: "Username for authentication",
			Required: true,
			Example:  "user",
		},
		"password": {
			Type:     "password",
			Label:    "Password",
			HelpText: "Password for authentication (optional if using private key)",
			Required: false,
		},
		"private_key": {
			Type:     "textarea",
			Label:    "Private Key",
			HelpText: "SSH private key content (optional if using password)",
			Required: false,
			Example:  "-----BEGIN OPENSSH PRIVATE KEY-----\n...",
		},
		"private_key_passphrase": {
			Type:     "password",
			Label:    "Private Key Passphrase",
			HelpText: "Passphrase for encrypted private key",
			Required: false,
		},
		"host_key_fingerprint": {
			Type:     "text",
			Label:    "Host Key Fingerprint",
			HelpText: "Expected SSH host key fingerprint for verification (optional)",
			Required: false,
			Example:  "SHA256:...",
		},
	}

	settingsFieldDefinitions := map[string]irminmodels.DynamicField{
		"remote_path": {
			Type:     "text",
			Label:    "Remote Path",
			HelpText: "Default remote directory path (optional, defaults to user home)",
			Required: false,
			Default:  "/",
			Example:  "/home/user/data",
		},
		"file_patterns": {
			Type:     "array",
			Label:    "File Patterns",
			HelpText: "File patterns to include/exclude (e.g., *.txt, *.pdf)",
			Required: false,
			Default:  "[*]",
		},
		"preserve_timestamps": {
			Type:     "select",
			Label:    "Preserve Timestamps",
			HelpText: "Preserve file modification times during transfer",
			Required: false,
			Default:  "true",
			Options: common.CreateSelectOptionsWithLabels(map[string]string{
				"true":  "Yes",
				"false": "No",
			}),
		},
		"overwrite_existing": {
			Type:     "select",
			Label:    "Overwrite Existing Files",
			HelpText: "Overwrite existing files during push operations",
			Required: false,
			Default:  "false",
			Options: common.CreateSelectOptionsWithLabels(map[string]string{
				"true":  "Yes",
				"false": "No",
			}),
		},
		"create_directories": {
			Type:     "select",
			Label:    "Create Directories",
			HelpText: "Create missing directories during upload",
			Required: false,
			Default:  "true",
			Options: common.CreateSelectOptionsWithLabels(map[string]string{
				"true":  "Yes",
				"false": "No",
			}),
		},
		"transfer_mode": {
			Type:     "select",
			Label:    "Transfer Mode",
			HelpText: "File transfer mode",
			Required: false,
			Default:  "binary",
			Options: common.CreateSelectOptionsWithLabels(map[string]string{
				"binary": "Binary",
				"text":   "Text",
			}),
		},
	}

	return detailsFieldDefinitions, settingsFieldDefinitions
}

// GetConnectorInfo returns the connector information for SFTP.
func GetConnectorInfo() models.ConnectorDetails {
	return models.ConnectorDetails{
		Name:             "SFTP",
		Description:      "Secure File Transfer Protocol connector for file operations",
		Version:          "1.0.0",
		StructureVersion: "1.0.0",
		Author:           "Tim Borovkov / Irmin",
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
