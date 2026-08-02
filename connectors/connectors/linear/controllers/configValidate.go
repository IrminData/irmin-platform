package linearcontrollers

import (
	"fmt"

	linearclient "irmin-connectors/connectors/linear/client"
	linearconfig "irmin-connectors/connectors/linear/config"

	"github.com/gofiber/fiber/v3"
)

// ConfigValidate godoc
// @Summary Validate Linear connector configuration
// @Description Validates the Linear Connection's settings (e.g., team_key shape, max_records cap). Linear authenticates via OAuth, so there are no credential fields to validate here — the OAuth flow's completion in Core is the actual auth check, surfaced through /v1/connections/:id/oauth/start.
// @Tags linear
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param settings[team_key] formData string false "Optional Linear team key (e.g., IRM)"
// @Param settings[max_records_per_resource] formData string false "Optional cap on records returned per pull"
// @Param settings[mcp_endpoint] formData string false "Optional MCP endpoint override"
// @Success 200 {object} irminmodels.ConnectorConfigurationValidationResult "Validation result"
// @Failure 400 {object} fiber.Map "Bad request"
// @Failure 401 {object} fiber.Map "Unauthorized"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /linear/configuration/validate [post]
func (cs *Controllers) ConfigValidate(c fiber.Ctx) error {
	return cs.HandleConfigValidation(c, cs)
}

// GetRequiredFormFields implements common.ConfigValidationProvider.
// Returns no required fields — Linear is OAuth-backed and every
// setting is optional. The optional list is the full settings shape
// so the form parser surfaces them on the validation response.
func (cs *Controllers) GetRequiredFormFields() ([]string, []string) {
	return linearconfig.GetRequiredDetailsFields(), linearconfig.GetOptionalFields()
}

// ValidateFields implements common.ConfigValidationProvider.
// Validates the optional `mcp_endpoint` setting against the host
// allowlist at save-time so a bad value surfaces in the console's
// validation pane rather than at first pull. The OAuth flow itself
// remains the credential check.
func (cs *Controllers) ValidateFields(_ fiber.Ctx, _, settings map[string]any) []string {
	var errs []string
	if raw, present := settings["mcp_endpoint"]; present {
		if s, ok := raw.(string); ok && s != "" {
			if _, err := linearclient.ResolveEndpoint(s); err != nil {
				errs = append(errs, fmt.Sprintf("mcp_endpoint: %v", err))
			}
		}
	}
	return errs
}

// TestConnection implements common.ConfigValidationProvider. We
// cannot probe Linear here because no bearer token is available
// (the OAuth flow lives on Core, not on connectors), so we report
// success unconditionally. The console's Connection wizard renders
// this as "validated" once the OAuth handshake completes.
//
// canConnect=true / detailsValid=true / settingsValid=true reflects
// reality: the user has not asked us to validate anything we can
// reach from here. Returning false would block the UI from advancing
// past validation when nothing's actually wrong.
func (cs *Controllers) TestConnection(
	_ fiber.Ctx, _, _ map[string]any,
) (bool, bool, bool, []string) {
	return true, true, true, nil
}
