package sftpcontrollers

import (
	sftpclient "irmin-connectors/connectors/sftp/client"
	sftpconfig "irmin-connectors/connectors/sftp/config"
	"irmin-connectors/utils"
	"time"

	"github.com/gofiber/fiber/v3"
)

const (
	// DefaultTestTimeoutSeconds is the default timeout for testing connections.
	DefaultTestTimeoutSeconds = 30
)

// ConfigValidate validates SFTP connection settings and credentials.
func (cs *Controllers) ConfigValidate(c fiber.Ctx) error {
	return cs.HandleConfigValidation(c, cs)
}

// GetRequiredFormFields implements the ConfigValidationProvider interface.
func (cs *Controllers) GetRequiredFormFields() ([]string, []string) {
	return sftpconfig.GetRequiredFields(), sftpconfig.GetOptionalFields()
}

// ValidateFields implements the ConfigValidationProvider interface.
func (cs *Controllers) ValidateFields(_ fiber.Ctx, details map[string]any, _ map[string]any) []string {
	var errors []string

	// Extract values using utility functions with defaults
	host := utils.GetStringFromMap(details, "host", "")
	username := utils.GetStringFromMap(details, "username", "")

	// Validate required fields
	if host == "" || username == "" {
		errors = append(errors, "Missing required connection details: host, username.")
	}

	// Validate authentication method
	if authErr := cs.validateAuthenticationMethod(details); authErr != nil {
		errors = append(errors, authErr.Error())
	}

	return errors
}

// TestConnection implements the ConfigValidationProvider interface.
func (cs *Controllers) TestConnection(
	_ fiber.Ctx,
	details map[string]any,
	_ map[string]any,
) (bool, bool, bool, []string) {
	var errors []string
	canConnect := false
	connectionDetailsValid := false
	connectionSettingsValid := false

	// Test actual SFTP connection
	testConfig := &sftpclient.ConnectionConfig{
		Host:                 utils.GetStringFromMap(details, "host", ""),
		Port:                 utils.GetIntFromMap(details, "port", sftpconfig.DefaultPort),
		Username:             utils.GetStringFromMap(details, "username", ""),
		Password:             utils.GetStringFromMap(details, "password", ""),
		PrivateKey:           utils.GetStringFromMap(details, "private_key", ""),
		PrivateKeyPassphrase: utils.GetStringFromMap(details, "private_key_passphrase", ""),
		HostKeyFingerprint:   utils.GetStringFromMap(details, "host_key_fingerprint", ""),
		Timeout:              DefaultTestTimeoutSeconds * time.Second,
	}

	client, err := sftpclient.NewSftpClient(testConfig)
	if err != nil {
		errors = append(errors, "Failed to create SFTP client: "+err.Error())
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}

	err = client.TestConnection()
	if err != nil {
		errors = append(errors, "Connection test failed: "+err.Error())
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}

	// If we reach here, connection was successful
	canConnect = true
	connectionDetailsValid = true
	connectionSettingsValid = true

	return canConnect, connectionDetailsValid, connectionSettingsValid, errors
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
