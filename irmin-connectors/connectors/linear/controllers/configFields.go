package linearcontrollers

import (
	linearconfig "irmin-connectors/connectors/linear/config"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"

	"github.com/gofiber/fiber/v3"
)

// ConfigFields godoc
// @Summary Get Linear connector configuration fields
// @Description Returns dynamic configuration field definitions for the Linear connector. The "details" key returns an empty map because Linear authenticates via OAuth; the "settings" key returns user-tunable options like team_key.
// @Tags linear
// @Security SystemTokenAuth
// @Accept json
// @Accept multipart/form-data
// @Produce json
// @Param key path string true "Configuration key" Enums(details, settings)
// @Success 200 {object} map[string]irminmodels.DynamicField "Configuration fields"
// @Failure 400 {object} fiber.Map "Bad request"
// @Failure 401 {object} fiber.Map "Unauthorized"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /linear/configuration/{key}/fields [post]
func (cs *Controllers) ConfigFields(c fiber.Ctx) error {
	return cs.HandleConfigFields(c, cs)
}

// GetDynamicFields implements common.ConfigFieldProvider. Returns
// the static schema for the requested key — Linear's config is fully
// declarative so the provider does no per-request decisions.
func (cs *Controllers) GetDynamicFields(
	_ fiber.Ctx,
	key string,
	_ map[string]string,
) (map[string]irminmodels.DynamicField, error) {
	switch key {
	case "details":
		return linearconfig.GetDetailsFieldDefinitions(), nil
	case "settings":
		return linearconfig.GetSettingsFieldDefinitions(), nil
	default:
		return nil, fiber.NewError(fiber.StatusBadRequest, "invalid configuration key")
	}
}
