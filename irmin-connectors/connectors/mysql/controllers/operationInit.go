package mysqlcontrollers

import (
	"irmin-connectors/connectors/common"
	mysqlconfig "irmin-connectors/connectors/mysql/config"

	"github.com/gofiber/fiber/v3"
)

// OperationInit handles the initialization of a new operation.
func (cs *Controllers) OperationInit(c fiber.Ctx) error {
	return cs.HandleOperationInit(c, cs)
}

// GetOperationFormFields implements the OperationInitProvider interface.
func (cs *Controllers) GetOperationFormFields() ([]string, []string) {
	return mysqlconfig.GetRequiredFields(), mysqlconfig.GetOptionalFields()
}

// BuildDetails implements the OperationInitProvider interface.
func (cs *Controllers) BuildDetails(fields map[string]string) (map[string]string, error) {
	return common.BuildDetailsFromFields(fields, mysqlconfig.GetDetailsFieldDefinitions()), nil
}

// BuildSettings implements the OperationInitProvider interface.
func (cs *Controllers) BuildSettings(fields map[string]string) (map[string]string, error) {
	return common.BuildSettingsFromFields(fields, mysqlconfig.GetSettingsFieldDefinitions()), nil
}
