package googledrivecontrollers

import (
	googledriveconfig "irmin-connectors/connectors/googledrive/config"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"

	"github.com/gofiber/fiber/v3"
)

// ConfigFields godoc
// @Summary Get Google Drive connector configuration fields
// @Description Returns dynamic configuration field definitions for the Google Drive connector. The "details" key returns an empty map because Google Drive authenticates via OAuth; the "settings" key returns user-tunable options like scope and max_records_per_resource.
// @Tags googledrive
// @Security SystemTokenAuth
// @Accept json
// @Accept multipart/form-data
// @Produce json
// @Param key path string true "Configuration key" Enums(details, settings)
// @Success 200 {object} map[string]irminmodels.DynamicField "Configuration fields"
// @Failure 400 {object} fiber.Map "Bad request"
// @Failure 401 {object} fiber.Map "Unauthorized"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /googledrive/configuration/{key}/fields [post]
func (cs *Controllers) ConfigFields(c fiber.Ctx) error {
	return cs.HandleConfigFields(c, cs)
}

// GetDynamicFields implements common.ConfigFieldProvider. Returns
// the static schema for the requested key — Google Drive's config is fully
// declarative so the provider does no per-request decisions.
func (cs *Controllers) GetDynamicFields(
	_ fiber.Ctx,
	key string,
	_ map[string]string,
) (map[string]irminmodels.DynamicField, error) {
	switch key {
	case "details":
		return googledriveconfig.GetDetailsFieldDefinitions(), nil
	case "settings":
		return googledriveconfig.GetSettingsFieldDefinitions(), nil
	default:
		return nil, fiber.NewError(fiber.StatusBadRequest, "invalid configuration key")
	}
}
