package httpcontrollers

import (
	"irmin-connectors/connectors/common"
	httpconfig "irmin-connectors/connectors/http/config"

	"github.com/gofiber/fiber/v3"
)

// OperationInit godoc
// @Summary Initialize HTTP operation
// @Description Initialize a new HTTP operation with connection details and settings, returning an operation token for subsequent requests
// @Tags http
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param details[url] formData string true "HTTP endpoint URL"
// @Param details[method] formData string true "HTTP method (GET, POST, PUT, PATCH, DELETE)"
// @Param details[headers] formData string false "HTTP headers as JSON object"
// @Param details[body] formData string false "Request body content"
// @Param details[timeout] formData integer false "Request timeout in seconds (default: 30)"
// @Param details[verify_ssl] formData boolean false "Verify SSL certificates (default: true)"
// @Success 200 {object} fiber.Map "Operation initialized successfully with operation token"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation data"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /http/operation/init [post]
func (cs *Controllers) OperationInit(c fiber.Ctx) error {
	return cs.HandleOperationInit(c, cs)
}

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
