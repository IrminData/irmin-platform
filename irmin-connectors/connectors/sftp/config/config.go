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

// Config defines the configuration structure for the SFTP connector.
type Config struct {
	// Connector metadata
	Name        string `json:"name"`
	Version     string `json:"version"`
	Description string `json:"description"`

	// Supported operations
	SupportedOperations []string `json:"supported_operations"`

	// Configuration field definitions
	SettingsFields []FieldDefinition `json:"settings_fields"`
	DetailsFields  []FieldDefinition `json:"details_fields"`

	// Validation rules
	ValidationRules []ValidationRule `json:"validation_rules"`

	// Default values
	Defaults map[string]interface{} `json:"defaults"`
}

// FieldDefinition describes a configuration field.
type FieldDefinition struct {
	Name         string                 `json:"name"`
	Type         string                 `json:"type"`
	Label        string                 `json:"label"`
	Description  string                 `json:"description"`
	Required     bool                   `json:"required"`
	Sensitive    bool                   `json:"sensitive,omitempty"`
	Default      interface{}            `json:"default,omitempty"`
	Placeholder  string                 `json:"placeholder,omitempty"`
	Options      []FieldOption          `json:"options,omitempty"`
	Validation   map[string]interface{} `json:"validation,omitempty"`
	Dependencies []string               `json:"dependencies,omitempty"`
}

// FieldOption represents an option for select fields.
type FieldOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

// ValidationRule defines validation logic for fields.
type ValidationRule struct {
	Field     string                 `json:"field"`
	Rules     []string               `json:"rules"`
	Message   string                 `json:"message"`
	Condition map[string]interface{} `json:"condition,omitempty"`
}

// GetDefaultConfig returns the default configuration for the SFTP connector.
func GetDefaultConfig() *Config {
	return &Config{
		Name:        "SFTP",
		Version:     "1.0.0",
		Description: "Secure File Transfer Protocol connector for file operations",
		SupportedOperations: []string{
			"pull", // Download files from SFTP server
			"push", // Upload files to SFTP server
		},
		SettingsFields: []FieldDefinition{
			{
				Name:        "remote_path",
				Type:        "string",
				Label:       "Remote Path",
				Description: "Default remote directory path",
				Required:    false,
				Default:     "/",
				Placeholder: "/home/user/data",
			},
			{
				Name:        "file_patterns",
				Type:        "array",
				Label:       "File Patterns",
				Description: "File patterns to include/exclude",
				Required:    false,
				Default:     []string{"*"},
			},
			{
				Name:        "preserve_timestamps",
				Type:        "boolean",
				Label:       "Preserve Timestamps",
				Description: "Preserve file modification times during transfer",
				Required:    false,
				Default:     true,
			},
			{
				Name:        "overwrite_existing",
				Type:        "boolean",
				Label:       "Overwrite Existing Files",
				Description: "Overwrite existing files during push operations",
				Required:    false,
				Default:     false,
			},
			{
				Name:        "create_directories",
				Type:        "boolean",
				Label:       "Create Directories",
				Description: "Create missing directories during upload",
				Required:    false,
				Default:     true,
			},
			{
				Name:        "transfer_mode",
				Type:        "select",
				Label:       "Transfer Mode",
				Description: "File transfer mode",
				Required:    false,
				Default:     "binary",
				Options: []FieldOption{
					{Value: "binary", Label: "Binary"},
					{Value: "text", Label: "Text"},
				},
			},
		},
		DetailsFields: []FieldDefinition{
			{
				Name:        "host",
				Type:        "string",
				Label:       "Host",
				Description: "SFTP server hostname or IP address",
				Required:    true,
				Placeholder: "sftp.example.com",
				Validation: map[string]interface{}{
					"min_length": 1,
					"max_length": DefaultMaxHostnameLen,
				},
			},
			{
				Name:        "port",
				Type:        "number",
				Label:       "Port",
				Description: "SFTP server port",
				Required:    false,
				Default:     DefaultPort,
				Validation: map[string]interface{}{
					"min": 1,
					"max": MaxPortNumber,
				},
			},
			{
				Name:        "username",
				Type:        "string",
				Label:       "Username",
				Description: "Username for authentication",
				Required:    true,
				Placeholder: "user",
				Validation: map[string]interface{}{
					"min_length": 1,
					"max_length": DefaultMaxUsernameLen,
				},
			},
			{
				Name:        "password",
				Type:        "password",
				Label:       "Password",
				Description: "Password for authentication (optional if using private key)",
				Required:    false,
				Sensitive:   true,
			},
			{
				Name:        "private_key",
				Type:        "textarea",
				Label:       "Private Key",
				Description: "SSH private key content (optional if using password)",
				Required:    false,
				Sensitive:   true,
				Placeholder: "-----BEGIN OPENSSH PRIVATE KEY-----\n...",
			},
			{
				Name:         "private_key_passphrase",
				Type:         "password",
				Label:        "Private Key Passphrase",
				Description:  "Passphrase for encrypted private key",
				Required:     false,
				Sensitive:    true,
				Dependencies: []string{"private_key"},
			},
			{
				Name:        "host_key_fingerprint",
				Type:        "string",
				Label:       "Host Key Fingerprint",
				Description: "Expected SSH host key fingerprint for verification (optional)",
				Required:    false,
				Placeholder: "SHA256:...",
			},
		},
		ValidationRules: []ValidationRule{
			{
				Field:   "authentication",
				Rules:   []string{"either_password_or_key"},
				Message: "Either password or private key must be provided for authentication",
			},
			{
				Field:   "host",
				Rules:   []string{"required", "hostname_or_ip"},
				Message: "Host must be a valid hostname or IP address",
			},
			{
				Field:   "port",
				Rules:   []string{"numeric", "range:1-65535"},
				Message: "Port must be a number between 1 and 65535",
			},
		},
		Defaults: map[string]interface{}{
			"port":                DefaultPort,
			"remote_path":         "/",
			"preserve_timestamps": true,
			"overwrite_existing":  false,
			"create_directories":  true,
			"transfer_mode":       "binary",
			"file_patterns":       []string{"*"},
		},
	}
}

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
