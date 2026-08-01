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

// ConfigValidate godoc
// @Summary Validate SFTP connector configuration
// @Description Validate SFTP connection settings and credentials by testing the actual connection
// @Tags sftp
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param details[host] formData string true "SFTP server hostname or IP address"
// @Param details[port] formData integer false "SFTP server port (default: 22)"
// @Param details[username] formData string true "Username for SFTP authentication"
// @Param details[password] formData string false "Password for SFTP authentication (if not using private key)"
// @Param details[private_key] formData string false "Private key for SFTP authentication (if not using password)"
// @Param details[private_key_passphrase] formData string false "Passphrase for encrypted private key"
// @Param details[host_key_fingerprint] formData string true "Expected host key fingerprint for security verification"
// @Success 200 {object} irminmodels.ConnectorConfigurationValidationResult "Configuration validation result"
// @Failure 400 {object} fiber.Map "Bad request - invalid configuration data"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /sftp/configuration/validate [post]
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
