package stripecontrollers

import (
	"context"
	"fmt"

	stripeclient "irmin-connectors/connectors/stripe/client"
	stripeconfig "irmin-connectors/connectors/stripe/config"
	stripemodels "irmin-connectors/connectors/stripe/models"

	"github.com/gofiber/fiber/v3"
)

// ConfigValidate godoc
// @Summary Validate Stripe connector configuration
// @Description Validate Stripe connection details by making a lightweight test call to the Stripe API (/v1/charges?limit=1)
// @Tags stripe
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param details[api_key] formData string true "Stripe restricted or secret API key"
// @Param settings[api_version] formData string false "Pinned Stripe-Version header"
// @Success 200 {object} irminmodels.ConnectorConfigurationValidationResult "Configuration validation result"
// @Failure 400 {object} fiber.Map "Bad request - invalid configuration data"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /stripe/configuration/validate [post]
func (cs *Controllers) ConfigValidate(c fiber.Ctx) error {
	return cs.HandleConfigValidation(c, cs)
}

// GetRequiredFormFields implements the ConfigValidationProvider interface.
// Only api_key is strictly required for validation — the api_version
// setting is optional and resolves to a default.
func (cs *Controllers) GetRequiredFormFields() ([]string, []string) {
	return stripeconfig.GetRequiredDetailsFields(), stripeconfig.GetOptionalFields()
}

// ValidateFields implements the ConfigValidationProvider interface.
// Checks structural validity of the provided details without hitting
// Stripe. TestConnection below does the live round-trip.
func (cs *Controllers) ValidateFields(_ fiber.Ctx, details map[string]any, _ map[string]any) []string {
	var errors []string
	if _, err := stripemodels.NewConnectionDetailsFromMap(details); err != nil {
		errors = append(errors, err.Error())
	}
	return errors
}

// TestConnection implements the ConfigValidationProvider interface.
// Constructs a live Stripe client from the provided details + settings
// and pings /v1/charges?limit=1 (Stripe's documented auth probe).
func (cs *Controllers) TestConnection(
	_ fiber.Ctx,
	details map[string]any,
	settings map[string]any,
) (bool, bool, bool, []string) {
	var errs []string
	canConnect := false
	detailsValid := false
	settingsValid := false

	parsedDetails, err := stripemodels.NewConnectionDetailsFromMap(details)
	if err != nil {
		errs = append(errs, fmt.Sprintf("Invalid connection details: %v", err))
		return canConnect, detailsValid, settingsValid, errs
	}
	detailsValid = true

	parsedSettings, err := stripemodels.NewConnectionSettingsFromMap(settings)
	if err != nil {
		// Settings are optional — a parsing failure means something
		// structural is wrong (nothing currently returns error here,
		// but future-proof for when we add stricter fields).
		errs = append(errs, fmt.Sprintf("Invalid connection settings: %v", err))
		return canConnect, detailsValid, settingsValid, errs
	}
	settingsValid = true

	stripe := stripeclient.NewClient(
		parsedDetails.APIKey,
		parsedSettings.ResolvedAPIVersion(),
	)
	ctx, cancel := context.WithTimeout(context.Background(), defaultValidationTimeout)
	defer cancel()

	if pingErr := stripe.Ping(ctx); pingErr != nil {
		if stripeclient.IsAuthError(pingErr) {
			errs = append(errs, fmt.Sprintf("Stripe rejected the API key: %v", pingErr))
		} else {
			errs = append(errs, fmt.Sprintf("Stripe API call failed: %v", pingErr))
		}
		return canConnect, detailsValid, settingsValid, errs
	}

	canConnect = true
	return canConnect, detailsValid, settingsValid, errs
}
