package pineconecontrollers

import (
	"irmin-connectors/connectors/common"
	pineconeconfig "irmin-connectors/connectors/pinecone/config"
)

// GetOperationFormFields implements the OperationConfigProvider interface.
func (cs *Controllers) GetOperationFormFields() ([]string, []string) {
	return pineconeconfig.GetRequiredFields(), pineconeconfig.GetOptionalFields()
}

// BuildDetails implements the OperationConfigProvider interface.
func (cs *Controllers) BuildDetails(fields map[string]string) (map[string]string, error) {
	return common.BuildDetailsFromFields(fields, pineconeconfig.GetDetailsFieldDefinitions()), nil
}

// BuildSettings implements the OperationConfigProvider interface.
func (cs *Controllers) BuildSettings(fields map[string]string) (map[string]string, error) {
	return common.BuildSettingsFromFields(fields, pineconeconfig.GetSettingsFieldDefinitions()), nil
}
