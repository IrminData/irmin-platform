package sftpcontrollers

import (
	"irmin-connectors/connectors/common"
	sftpconfig "irmin-connectors/connectors/sftp/config"
)

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
