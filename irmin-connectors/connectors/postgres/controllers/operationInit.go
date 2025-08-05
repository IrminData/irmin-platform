package postgrescontrollers

import (
	"irmin-connectors/connectors/common"
	postgresconfig "irmin-connectors/connectors/postgres/config"

	"github.com/gofiber/fiber/v3"
)

// OperationInit godoc
// @Summary Initialize PostgreSQL operation
// @Description Initialize a new PostgreSQL operation with connection details and settings, returning an operation token for subsequent requests
// @Tags postgres
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param details[host] formData string true "PostgreSQL server hostname or IP address"
// @Param details[port] formData integer false "PostgreSQL server port (default: 5432)"
// @Param details[user] formData string true "Username for PostgreSQL authentication"
// @Param details[password] formData string true "Password for PostgreSQL authentication"
// @Param details[default_db] formData string false "Default database for initial connection"
// @Param details[ssl_mode] formData boolean false "Enable SSL mode for secure connections"
// @Param settings[database] formData string true "Target database name for operations"
// @Success 200 {object} fiber.Map "Operation initialized successfully with operation token"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation data"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /postgres/operation/init [post]
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
