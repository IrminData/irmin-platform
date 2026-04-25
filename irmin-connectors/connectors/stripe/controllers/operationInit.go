package stripecontrollers

import (
	"irmin-connectors/connectors/common"
	stripeconfig "irmin-connectors/connectors/stripe/config"
)

// GetOperationFormFields implements the OperationInitProvider interface.
func (cs *Controllers) GetOperationFormFields() ([]string, []string) {
	return stripeconfig.GetRequiredFields(), stripeconfig.GetOptionalFields()
}

// BuildDetails implements the OperationInitProvider interface.
func (cs *Controllers) BuildDetails(fields map[string]string) (map[string]string, error) {
	return common.BuildDetailsFromFields(fields, stripeconfig.GetDetailsFieldDefinitions()), nil
}

// BuildSettings implements the OperationInitProvider interface.
func (cs *Controllers) BuildSettings(fields map[string]string) (map[string]string, error) {
	return common.BuildSettingsFromFields(fields, stripeconfig.GetSettingsFieldDefinitions()), nil
}
