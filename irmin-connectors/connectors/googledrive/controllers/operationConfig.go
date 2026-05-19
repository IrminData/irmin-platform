package googledrivecontrollers

import (
	"irmin-connectors/connectors/common"
	googledriveconfig "irmin-connectors/connectors/googledrive/config"
)

// GetOperationFormFields implements common.OperationConfigProvider.
// Google Drive has no required detail fields (OAuth supplies the
// credential), but has optional settings (scope, max_records_per_resource).
func (cs *Controllers) GetOperationFormFields() ([]string, []string) {
	return googledriveconfig.GetRequiredFields(), googledriveconfig.GetOptionalFields()
}

// BuildDetails implements common.OperationConfigProvider. Google Drive
// has no detail fields; the result is an empty map by construction
// because GetDetailsFieldDefinitions returns an empty map.
func (cs *Controllers) BuildDetails(fields map[string]string) (map[string]string, error) {
	return common.BuildDetailsFromFields(fields, googledriveconfig.GetDetailsFieldDefinitions()), nil
}

// BuildSettings implements common.OperationConfigProvider.
func (cs *Controllers) BuildSettings(fields map[string]string) (map[string]string, error) {
	return common.BuildSettingsFromFields(fields, googledriveconfig.GetSettingsFieldDefinitions()), nil
}
