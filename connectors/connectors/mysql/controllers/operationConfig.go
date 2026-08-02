package mysqlcontrollers

import (
	"irmin-connectors/connectors/common"
	mysqlconfig "irmin-connectors/connectors/mysql/config"
)

// GetOperationFormFields implements the OperationConfigProvider interface.
func (cs *Controllers) GetOperationFormFields() ([]string, []string) {
	return mysqlconfig.GetRequiredFields(), mysqlconfig.GetOptionalFields()
}

// BuildDetails implements the OperationConfigProvider interface.
func (cs *Controllers) BuildDetails(fields map[string]string) (map[string]string, error) {
	return common.BuildDetailsFromFields(fields, mysqlconfig.GetDetailsFieldDefinitions()), nil
}

// BuildSettings implements the OperationConfigProvider interface.
func (cs *Controllers) BuildSettings(fields map[string]string) (map[string]string, error) {
	return common.BuildSettingsFromFields(fields, mysqlconfig.GetSettingsFieldDefinitions()), nil
}
