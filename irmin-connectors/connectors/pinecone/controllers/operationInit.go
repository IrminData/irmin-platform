package pineconecontrollers

import (
	"irmin-connectors/connectors/common"
	pineconeconfig "irmin-connectors/connectors/pinecone/config"

	"github.com/gofiber/fiber/v3"
)

// OperationInit godoc
// @Summary Initialize Pinecone operation
// @Description Initialize a new Pinecone operation with connection details and settings, returning an operation token for subsequent requests
// @Tags pinecone
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param details[api_key] formData string true "Pinecone API key"
// @Param settings[host] formData string true "Pinecone index host URL"
// @Param settings[namespace] formData string false "Target namespace within the index"
// @Success 200 {object} fiber.Map "Operation initialized successfully with operation token"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation data"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /pinecone/operation/init [post]
func (cs *Controllers) OperationInit(c fiber.Ctx) error {
	return cs.HandleOperationInit(c, cs)
}

// GetOperationFormFields implements the OperationInitProvider interface.
func (cs *Controllers) GetOperationFormFields() ([]string, []string) {
	return pineconeconfig.GetRequiredFields(), pineconeconfig.GetOptionalFields()
}

// BuildDetails implements the OperationInitProvider interface.
func (cs *Controllers) BuildDetails(fields map[string]string) (map[string]string, error) {
	return common.BuildDetailsFromFields(fields, pineconeconfig.GetDetailsFieldDefinitions()), nil
}

// BuildSettings implements the OperationInitProvider interface.
func (cs *Controllers) BuildSettings(fields map[string]string) (map[string]string, error) {
	return common.BuildSettingsFromFields(fields, pineconeconfig.GetSettingsFieldDefinitions()), nil
}
