package sftpcontrollers

import (
	"irmin-connectors/connectors/common"
	sftpconfig "irmin-connectors/connectors/sftp/config"

	"github.com/gofiber/fiber/v3"
)

// OperationInit godoc
// @Summary Initialize SFTP operation
// @Description Initialize a new SFTP operation with connection details and settings, returning an operation token for subsequent requests
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
// @Param details[host_key_fingerprint] formData string false "Expected host key fingerprint for security verification"
// @Success 200 {object} fiber.Map "Operation initialized successfully with operation token"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation data"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /sftp/operation/init [post]
func (cs *Controllers) OperationInit(c fiber.Ctx) error {
	return cs.HandleOperationInit(c, cs)
}

// GetOperationFormFields implements the OperationInitProvider interface.
func (cs *Controllers) GetOperationFormFields() ([]string, []string) {
	return sftpconfig.GetRequiredFields(), sftpconfig.GetOptionalFields()
}

// BuildDetails implements the OperationInitProvider interface.
func (cs *Controllers) BuildDetails(fields map[string]string) (map[string]string, error) {
	return common.BuildDetailsFromFields(fields, sftpconfig.GetDetailsFieldDefinitions()), nil
}

// BuildSettings implements the OperationInitProvider interface.
func (cs *Controllers) BuildSettings(fields map[string]string) (map[string]string, error) {
	return common.BuildSettingsFromFields(fields, sftpconfig.GetSettingsFieldDefinitions()), nil
}
