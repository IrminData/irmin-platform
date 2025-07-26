package sftpcontrollers

import (
	sftpconfig "irmin-connectors/connectors/sftp/config"
	"irmin-connectors/models"

	"github.com/gofiber/fiber/v3"
)

// ConfigFields handles the configuration fields endpoint.
func (cs *Controllers) ConfigFields(c fiber.Ctx) error {
	return cs.HandleConfigFields(c, cs)
}

// GetDynamicFields implements the ConfigFieldProvider interface.
func (cs *Controllers) GetDynamicFields(
	_ fiber.Ctx,
	key string,
	_ map[string]string,
) (map[string]models.DynamicField, error) {
	switch key {
	case "settings":
		return cs.getSettingsFields(), nil
	case "details":
		return cs.getDetailsFields(), nil
	default:
		return nil, fiber.NewError(
			fiber.StatusBadRequest,
			"Invalid configuration key. Expected 'settings' or 'details'",
		)
	}
}

// getSettingsFields returns the connection settings configuration fields.
func (cs *Controllers) getSettingsFields() map[string]models.DynamicField {
	return sftpconfig.GetSettingsFieldDefinitions()
}

// getDetailsFields returns the connection details configuration fields.
func (cs *Controllers) getDetailsFields() map[string]models.DynamicField {
	return sftpconfig.GetDetailsFieldDefinitions()
}
