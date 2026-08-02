package linearcontrollers

import (
	"irmin-connectors/connectors/common"
	linearconfig "irmin-connectors/connectors/linear/config"
)

// GetOperationFormFields implements common.OperationConfigProvider.
// Linear has no required fields (OAuth supplies the credential and
// every setting defaults sensibly), so the required slice is empty.
func (cs *Controllers) GetOperationFormFields() ([]string, []string) {
	return linearconfig.GetRequiredFields(), linearconfig.GetOptionalFields()
}

// BuildDetails implements common.OperationConfigProvider. Linear has
// no detail fields; the result is an empty map by construction
// because GetDetailsFieldDefinitions returns an empty map.
func (cs *Controllers) BuildDetails(fields map[string]string) (map[string]string, error) {
	return common.BuildDetailsFromFields(fields, linearconfig.GetDetailsFieldDefinitions()), nil
}

// BuildSettings implements common.OperationConfigProvider.
func (cs *Controllers) BuildSettings(fields map[string]string) (map[string]string, error) {
	return common.BuildSettingsFromFields(fields, linearconfig.GetSettingsFieldDefinitions()), nil
}
