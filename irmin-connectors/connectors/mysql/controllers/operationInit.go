package mysqlcontrollers

import (
	"irmin-connectors/connectors/common"
	mysqlconfig "irmin-connectors/connectors/mysql/config"

	"github.com/gofiber/fiber/v3"
)

// OperationInit godoc
// @Summary Initialize MySQL operation
// @Description Initialize a new MySQL operation with connection details and settings, returning an operation token for subsequent requests
// @Tags mysql
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param details[host] formData string true "MySQL server hostname or IP address"
// @Param details[port] formData integer false "MySQL server port (default: 3306)"
// @Param details[username] formData string true "Username for MySQL authentication"
// @Param details[password] formData string true "Password for MySQL authentication"
// @Param details[default_db] formData string false "Default database for initial connection"
// @Param settings[database] formData string true "Target database name for operations"
// @Success 200 {object} fiber.Map "Operation initialized successfully with operation token"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation data"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /mysql/operation/init [post]
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
