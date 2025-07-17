package sftpcontrollers

import (
	sftpconfig "irmin-connectors/connectors/sftp/config"

	"github.com/gofiber/fiber/v3"
)

// ConfigFields returns dynamic configuration fields based on the connection type.
func (cs *Controllers) ConfigFields(c fiber.Ctx) error {
	// Get the configuration key from the URL parameter
	key := c.Params("key")

	switch key {
	case "settings":
		return cs.getSettingsFields(c)
	case "details":
		return cs.getDetailsFields(c)
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid configuration key. Expected 'settings' or 'details'",
		})
	}
}

// getSettingsFields returns the connection settings configuration fields.
func (cs *Controllers) getSettingsFields(c fiber.Ctx) error {
	fields := []fiber.Map{
		{
			"name":        "remote_path",
			"type":        "string",
			"label":       "Remote Path",
			"description": "Default remote directory path (optional, defaults to user home)",
			"required":    false,
			"default":     "/",
			"placeholder": "/home/user/data",
		},
		{
			"name":        "file_patterns",
			"type":        "array",
			"label":       "File Patterns",
			"description": "File patterns to include/exclude (e.g., *.txt, *.pdf)",
			"required":    false,
			"default":     []string{"*"},
		},
		{
			"name":        "preserve_timestamps",
			"type":        "boolean",
			"label":       "Preserve Timestamps",
			"description": "Preserve file modification times during transfer",
			"required":    false,
			"default":     true,
		},
		{
			"name":        "overwrite_existing",
			"type":        "boolean",
			"label":       "Overwrite Existing Files",
			"description": "Overwrite existing files during push operations",
			"required":    false,
			"default":     false,
		},
		{
			"name":        "create_directories",
			"type":        "boolean",
			"label":       "Create Directories",
			"description": "Create missing directories during upload",
			"required":    false,
			"default":     true,
		},
		{
			"name":        "transfer_mode",
			"type":        "select",
			"label":       "Transfer Mode",
			"description": "File transfer mode",
			"required":    false,
			"default":     "binary",
			"options": []fiber.Map{
				{"value": "binary", "label": "Binary"},
				{"value": "text", "label": "Text"},
			},
		},
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"fields": fields,
	})
}

// getDetailsFields returns the connection details configuration fields.
func (cs *Controllers) getDetailsFields(c fiber.Ctx) error {
	fields := []fiber.Map{
		{
			"name":        "host",
			"type":        "string",
			"label":       "Host",
			"description": "SFTP server hostname or IP address",
			"required":    true,
			"placeholder": "sftp.example.com",
		},
		{
			"name":        "port",
			"type":        "number",
			"label":       "Port",
			"description": "SFTP server port",
			"required":    false,
			"default":     sftpconfig.DefaultPort,
			"min":         1,
			"max":         sftpconfig.MaxPortNumber,
		},
		{
			"name":        "username",
			"type":        "string",
			"label":       "Username",
			"description": "Username for authentication",
			"required":    true,
			"placeholder": "user",
		},
		{
			"name":        "password",
			"type":        "password",
			"label":       "Password",
			"description": "Password for authentication (optional if using private key)",
			"required":    false,
			"sensitive":   true,
		},
		{
			"name":        "private_key",
			"type":        "textarea",
			"label":       "Private Key",
			"description": "SSH private key content (optional if using password)",
			"required":    false,
			"sensitive":   true,
			"placeholder": "-----BEGIN OPENSSH PRIVATE KEY-----\n...",
		},
		{
			"name":        "private_key_passphrase",
			"type":        "password",
			"label":       "Private Key Passphrase",
			"description": "Passphrase for encrypted private key",
			"required":    false,
			"sensitive":   true,
		},
		{
			"name":        "host_key_fingerprint",
			"type":        "string",
			"label":       "Host Key Fingerprint",
			"description": "Expected SSH host key fingerprint for verification (optional)",
			"required":    false,
			"placeholder": "SHA256:...",
		},
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"fields": fields,
	})
}
