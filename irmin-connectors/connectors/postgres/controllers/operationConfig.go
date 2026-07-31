package postgrescontrollers

import (
	"irmin-connectors/connectors/common"
	postgresconfig "irmin-connectors/connectors/postgres/config"
)

// GetOperationFormFields implements the OperationConfigProvider interface.
func (cs *Controllers) GetOperationFormFields() ([]string, []string) {
	return postgresconfig.GetRequiredFields(), postgresconfig.GetOptionalFields()
}

// BuildDetails implements the OperationConfigProvider interface.
func (cs *Controllers) BuildDetails(fields map[string]string) (map[string]string, error) {
	return common.BuildDetailsFromFields(fields, postgresconfig.GetDetailsFieldDefinitions()), nil
}

// BuildSettings implements the OperationConfigProvider interface.
func (cs *Controllers) BuildSettings(fields map[string]string) (map[string]string, error) {
	return common.BuildSettingsFromFields(fields, postgresconfig.GetSettingsFieldDefinitions()), nil
}
