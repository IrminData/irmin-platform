package postgrescontrollers

import (
	"irmin-connectors/connectors/common"
	postgresconfig "irmin-connectors/connectors/postgres/config"

	"github.com/gofiber/fiber/v3"
)

// OperationInit handles the initialization of a new operation.
func (cs *Controllers) OperationInit(c fiber.Ctx) error {
	return cs.HandleOperationInit(c, cs)
}

// GetOperationFormFields implements the OperationInitProvider interface.
func (cs *Controllers) GetOperationFormFields() ([]string, []string) {
	return postgresconfig.GetRequiredFields(), postgresconfig.GetOptionalFields()
}

// BuildDetails implements the OperationInitProvider interface.
func (cs *Controllers) BuildDetails(fields map[string]string) (map[string]string, error) {
	return common.BuildDetailsFromFields(fields, postgresconfig.GetDetailsFieldDefinitions()), nil
}

// BuildSettings implements the OperationInitProvider interface.
func (cs *Controllers) BuildSettings(fields map[string]string) (map[string]string, error) {
	return common.BuildSettingsFromFields(fields, postgresconfig.GetSettingsFieldDefinitions()), nil
}
