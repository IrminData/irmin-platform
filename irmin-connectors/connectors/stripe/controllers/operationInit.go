package stripecontrollers

import (
	"irmin-connectors/connectors/common"
	stripeconfig "irmin-connectors/connectors/stripe/config"

	"github.com/gofiber/fiber/v3"
)

// OperationInit godoc
// @Summary Initialize Stripe operation
// @Description Initialize a new Stripe operation with connection details and settings, returning an operation token for subsequent requests
// @Tags stripe
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param details[api_key] formData string true "Stripe restricted or secret API key"
// @Param settings[api_version] formData string false "Pinned Stripe-Version header (optional)"
// @Success 200 {object} fiber.Map "Operation initialized successfully with operation token"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation data"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /stripe/operation/init [post]
func (cs *Controllers) OperationInit(c fiber.Ctx) error {
	return cs.HandleOperationInit(c, cs)
}

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
