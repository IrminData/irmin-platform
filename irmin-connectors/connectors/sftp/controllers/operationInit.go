package sftpcontrollers

import (
	"irmin-connectors/connectors/common"
	sftpconfig "irmin-connectors/connectors/sftp/config"

	"github.com/gofiber/fiber/v3"
)

// OperationInit initializes SFTP operations with connection testing.
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
