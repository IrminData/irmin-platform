package httpcontrollers

import (
	"irmin-connectors/connectors/common"
	httpconfig "irmin-connectors/connectors/http/config"
)

// GetOperationFormFields implements the OperationInitProvider interface.
func (cs *Controllers) GetOperationFormFields() ([]string, []string) {
	return httpconfig.GetRequiredFields(), httpconfig.GetOptionalFields()
}

// BuildDetails implements the OperationInitProvider interface.
func (cs *Controllers) BuildDetails(fields map[string]string) (map[string]string, error) {
	return common.BuildDetailsFromFields(fields, httpconfig.GetDetailsFieldDefinitions()), nil
}

// BuildSettings implements the OperationInitProvider interface.
func (cs *Controllers) BuildSettings(fields map[string]string) (map[string]string, error) {
	return common.BuildSettingsFromFields(fields, httpconfig.GetSettingsFieldDefinitions()), nil
}
