package sftpcontrollers

import (
	"encoding/json"
	sftpclient "irmin-connectors/connectors/sftp/client"
	sftpconfig "irmin-connectors/connectors/sftp/config"
	"irmin-connectors/utils"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
)

const (
	// DefaultTestTimeoutSeconds is the default timeout for testing connections.
	DefaultTestTimeoutSeconds = 30
)

// ConfigValidate validates SFTP connection settings and credentials.
func (cs *Controllers) ConfigValidate(c fiber.Ctx) error {
	// Parse form fields to get configuration data
	fields, err := utils.ParseFormFields(c, nil, []string{"settings", "details"})
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Failed to parse form fields: " + err.Error(),
		})
	}

	// Parse settings JSON
	var settings map[string]any
	if settingsStr, exists := fields["settings"]; exists && settingsStr != "" {
		if settingsErr := json.Unmarshal([]byte(settingsStr), &settings); settingsErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid settings JSON: " + settingsErr.Error(),
			})
		}
	}

	// Parse details JSON
	var details map[string]any
	if detailsStr, exists := fields["details"]; exists && detailsStr != "" {
		if detailsErr := json.Unmarshal([]byte(detailsStr), &details); detailsErr != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid details JSON: " + detailsErr.Error(),
			})
		}
	}

	// Validate required fields
	if fieldErr := cs.validateRequiredFields(details); fieldErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fieldErr.Error(),
		})
	}

	// Validate authentication method
	if authErr := cs.validateAuthenticationMethod(details); authErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": authErr.Error(),
		})
	}

	// Test actual SFTP connection
	testConfig := &sftpclient.ConnectionConfig{
		Host:                 getStringFromMap(details, "host"),
		Port:                 getIntFromMap(details, "port", sftpconfig.DefaultPort),
		Username:             getStringFromMap(details, "username"),
		Password:             getStringFromMap(details, "password"),
		PrivateKey:           getStringFromMap(details, "private_key"),
		PrivateKeyPassphrase: getStringFromMap(details, "private_key_passphrase"),
		HostKeyFingerprint:   getStringFromMap(details, "host_key_fingerprint"),
		Timeout:              DefaultTestTimeoutSeconds * time.Second,
	}

	client, err := sftpclient.NewSftpClient(testConfig)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"valid":   false,
			"message": "Failed to create SFTP client: " + err.Error(),
		})
	}

	err = client.TestConnection()
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"valid":   false,
			"message": "Connection test failed: " + err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"valid":   true,
		"message": "Configuration is valid and connection successful",
		"details": fiber.Map{
			"host_reachable":    true,
			"authentication_ok": true,
			"connection_tested": true,
		},
	})
}

// validateRequiredFields validates that all required fields are present.
func (cs *Controllers) validateRequiredFields(details map[string]any) error {
	requiredFields := []string{"host", "username"}

	for _, field := range requiredFields {
		if value, exists := details[field]; !exists || value == "" {
			return fiber.NewError(fiber.StatusBadRequest, "Missing required field: "+field)
		}
	}

	return nil
}

// validateAuthenticationMethod ensures either password or private key is provided.
func (cs *Controllers) validateAuthenticationMethod(details map[string]any) error {
	password, hasPassword := details["password"]
	privateKey, hasPrivateKey := details["private_key"]

	// Check if password is provided and not empty
	var passwordProvided bool
	if hasPassword && password != nil {
		if passwordStr, ok := password.(string); ok {
			passwordProvided = passwordStr != ""
		}
	}

	// Check if private key is provided and not empty
	var privateKeyProvided bool
	if hasPrivateKey && privateKey != nil {
		if privateKeyStr, ok := privateKey.(string); ok {
			privateKeyProvided = privateKeyStr != ""
		}
	}

	if !passwordProvided && !privateKeyProvided {
		return fiber.NewError(
			fiber.StatusBadRequest,
			"Either password or private_key must be provided for authentication",
		)
	}

	return nil
}

// Helper functions to extract values from map with type conversion.
func getStringFromMap(m map[string]any, key string) string {
	if val, exists := m[key]; exists && val != nil {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}

func getIntFromMap(m map[string]any, key string, defaultValue int) int {
	val, exists := m[key]
	if !exists || val == nil {
		return defaultValue
	}

	if str, ok := val.(string); ok {
		if intVal, err := strconv.Atoi(str); err == nil {
			return intVal
		}
	}

	if intVal, ok := val.(int); ok {
		return intVal
	}

	if floatVal, ok := val.(float64); ok {
		return int(floatVal)
	}

	return defaultValue
}
