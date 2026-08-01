package firecrawlcontrollers

import (
	firecrawlconfig "irmin-connectors/connectors/firecrawl/config"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"

	"github.com/gofiber/fiber/v3"
)

// ConfigFields godoc
// @Summary Get Firecrawl connector configuration fields
// @Description Get dynamic configuration fields for the Firecrawl connector based on the configuration key (details or settings)
// @Tags firecrawl
// @Security SystemTokenAuth
// @Accept json
// @Accept multipart/form-data
// @Produce json
// @Param key path string true "Configuration key" Enums(details, settings)
// @Success 200 {object} map[string]irminmodels.DynamicField "Configuration fields retrieved successfully"
// @Failure 400 {object} fiber.Map "Bad request - invalid configuration key"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /firecrawl/configuration/{key}/fields [post]
func (cs *Controllers) ConfigFields(c fiber.Ctx) error {
	return cs.HandleConfigFields(c, cs)
}

// GetDynamicFields implements the ConfigFieldProvider interface.
func (cs *Controllers) GetDynamicFields(
	_ fiber.Ctx,
	key string,
	_ map[string]string,
) (map[string]irminmodels.DynamicField, error) {
	switch key {
	case "details":
		return cs.getDetailsFields(), nil
	case "settings":
		return cs.getSettingsFields(), nil
	default:
		return nil, fiber.NewError(fiber.StatusBadRequest, "invalid configuration key")
	}
}

// getDetailsFields returns the connection details configuration fields.
func (cs *Controllers) getDetailsFields() map[string]irminmodels.DynamicField {
	return firecrawlconfig.GetDetailsFieldDefinitions()
}

// getSettingsFields returns the connection settings configuration fields.
func (cs *Controllers) getSettingsFields() map[string]irminmodels.DynamicField {
	return firecrawlconfig.GetSettingsFieldDefinitions()
}
