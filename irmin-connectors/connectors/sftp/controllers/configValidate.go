package sftpcontrollers

import (
	sftpclient "irmin-connectors/connectors/sftp/client"
	sftpconfig "irmin-connectors/connectors/sftp/config"
	sftpmodels "irmin-connectors/connectors/sftp/models"
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

	// Use the model for validation
	_, err := sftpmodels.NewConnectionDetailsFromMap(details)
	if err != nil {
		errors = append(errors, err.Error())
	}

	return errors
}

// TestConnection implements the ConfigValidationProvider interface.
func (cs *Controllers) TestConnection(
	_ fiber.Ctx,
	details map[string]any,
	settings map[string]any,
) (bool, bool, bool, []string) {
	var errors []string
	canConnect := false
	connectionDetailsValid := false
	connectionSettingsValid := false

	// Parse connection details using model
	connectionDetails, err := sftpmodels.NewConnectionDetailsFromMap(details)
	if err != nil {
		errors = append(errors, "Invalid connection details: "+err.Error())
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}

	// Test actual SFTP connection using model fields
	testConfig := &sftpclient.ConnectionConfig{
		Host:                 connectionDetails.Host,
		Port:                 connectionDetails.Port,
		Username:             connectionDetails.Username,
		Password:             connectionDetails.Password,
		PrivateKey:           connectionDetails.PrivateKey,
		PrivateKeyPassphrase: connectionDetails.PrivateKeyPassphrase,
		HostKeyFingerprint:   connectionDetails.HostKeyFingerprint,
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

	// Parse connection settings (these are optional for SFTP)
	_, _ = sftpmodels.NewConnectionSettingsFromMap(settings)
	// Settings are always considered valid for SFTP as they are optional
	connectionSettingsValid = true

	return canConnect, connectionDetailsValid, connectionSettingsValid, errors
}
