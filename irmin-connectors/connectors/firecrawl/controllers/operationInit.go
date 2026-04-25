package firecrawlcontrollers

import (
	"irmin-connectors/connectors/common"
	firecrawlconfig "irmin-connectors/connectors/firecrawl/config"
)

// GetOperationFormFields implements the OperationInitProvider interface.
func (cs *Controllers) GetOperationFormFields() ([]string, []string) {
	return firecrawlconfig.GetRequiredFields(), firecrawlconfig.GetOptionalFields()
}

// BuildDetails implements the OperationInitProvider interface.
func (cs *Controllers) BuildDetails(fields map[string]string) (map[string]string, error) {
	return common.BuildDetailsFromFields(fields, firecrawlconfig.GetDetailsFieldDefinitions()), nil
}

// BuildSettings implements the OperationInitProvider interface.
func (cs *Controllers) BuildSettings(fields map[string]string) (map[string]string, error) {
	return common.BuildSettingsFromFields(fields, firecrawlconfig.GetSettingsFieldDefinitions()), nil
}
