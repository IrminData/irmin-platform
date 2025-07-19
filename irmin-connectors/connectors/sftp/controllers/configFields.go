package sftpcontrollers

import (
	sftpconfig "irmin-connectors/connectors/sftp/config"
	"irmin-connectors/models"

	"github.com/gofiber/fiber/v3"
)

// ConfigFields returns dynamic configuration fields based on the connection type.
func (cs *Controllers) ConfigFields(c fiber.Ctx) error {
	// Get the configuration key from the URL parameter
	key := c.Params("key")

	// Get dynamic fields based on the key
	dynamicFields, err := cs.getDynamicFields(key)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Return the fields directly as JSON
	return c.Status(fiber.StatusOK).JSON(dynamicFields)
}

// getDynamicFields returns the appropriate dynamic fields based on the key.
func (cs *Controllers) getDynamicFields(key string) (map[string]models.DynamicField, error) {
	switch key {
	case "settings":
		return cs.getSettingsFields()
	case "details":
		return cs.getDetailsFields()
	default:
		return nil, fiber.NewError(
			fiber.StatusBadRequest,
			"Invalid configuration key. Expected 'settings' or 'details'",
		)
	}
}

// getSettingsFields returns the connection settings configuration fields.
func (cs *Controllers) getSettingsFields() (map[string]models.DynamicField, error) {
	return map[string]models.DynamicField{
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
			Default:  []string{"*"},
		},
		"preserve_timestamps": {
			Type:     "select",
			Label:    "Preserve Timestamps",
			HelpText: "Preserve file modification times during transfer",
			Required: false,
			Default:  "true",
			Options: []models.SelectOption{
				{Key: "true", Value: "Yes"},
				{Key: "false", Value: "No"},
			},
		},
		"overwrite_existing": {
			Type:     "select",
			Label:    "Overwrite Existing Files",
			HelpText: "Overwrite existing files during push operations",
			Required: false,
			Default:  "false",
			Options: []models.SelectOption{
				{Key: "true", Value: "Yes"},
				{Key: "false", Value: "No"},
			},
		},
		"create_directories": {
			Type:     "select",
			Label:    "Create Directories",
			HelpText: "Create missing directories during upload",
			Required: false,
			Default:  "true",
			Options: []models.SelectOption{
				{Key: "true", Value: "Yes"},
				{Key: "false", Value: "No"},
			},
		},
		"transfer_mode": {
			Type:     "select",
			Label:    "Transfer Mode",
			HelpText: "File transfer mode",
			Required: false,
			Default:  "binary",
			Options: []models.SelectOption{
				{Key: "binary", Value: "Binary"},
				{Key: "text", Value: "Text"},
			},
		},
	}, nil
}

// getDetailsFields returns the connection details configuration fields.
func (cs *Controllers) getDetailsFields() (map[string]models.DynamicField, error) {
	return map[string]models.DynamicField{
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
			Default:  sftpconfig.DefaultPort,
			Min:      1,
			Max:      sftpconfig.MaxPortNumber,
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
	}, nil
}
