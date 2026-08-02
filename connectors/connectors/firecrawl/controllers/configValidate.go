package firecrawlcontrollers

import (
	"irmin-connectors/connectors/firecrawl/client"
	firecrawlconfig "irmin-connectors/connectors/firecrawl/config"

	"github.com/gofiber/fiber/v3"
)

const minAPIKeyLength = 10

// ConfigValidate godoc
// @Summary Validate Firecrawl connector configuration
// @Description Validate Firecrawl configuration by checking the API key and operation parameters
// @Tags firecrawl
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param details[api_key] formData string true "Firecrawl API key"
// @Param details[operation_type] formData string true "Operation type (scrape, crawl, map, search)"
// @Param details[url] formData string false "Target URL (required for scrape, crawl, map)"
// @Param details[query] formData string false "Search query (required for search)"
// @Param details[output_format] formData string false "Output format (markdown, html, json)"
// @Param details[limit] formData integer false "Maximum pages/results limit"
// @Success 200 {object} irminmodels.ConnectorConfigurationValidationResult "Configuration validation result"
// @Failure 400 {object} fiber.Map "Bad request - invalid configuration data"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /firecrawl/configuration/validate [post]
func (cs *Controllers) ConfigValidate(c fiber.Ctx) error {
	return cs.HandleConfigValidation(c, cs)
}

// GetRequiredFormFields implements the ConfigValidationProvider interface.
func (cs *Controllers) GetRequiredFormFields() ([]string, []string) {
	return firecrawlconfig.GetRequiredFields(), firecrawlconfig.GetOptionalFields()
}

// ValidateFields implements the ConfigValidationProvider interface.
func (cs *Controllers) ValidateFields(_ fiber.Ctx, details map[string]any, _ map[string]any) []string {
	var errors []string

	// Validate the configuration using the Firecrawl client validation
	if err := client.ValidateConfiguration(details); err != nil {
		errors = append(errors, err.Error())
	}

	return errors
}

// TestConnection implements the ConfigValidationProvider interface.
// For Firecrawl, we validate the configuration but don't make an actual API call
// since that would consume credits.
func (cs *Controllers) TestConnection(
	_ fiber.Ctx,
	details map[string]any,
	_ map[string]any,
) (bool, bool, bool, []string) {
	var errors []string
	canConnect := false
	connectionDetailsValid := false
	connectionSettingsValid := true // Firecrawl settings are always valid (none defined)

	// Validate configuration
	if err := client.ValidateConfiguration(details); err != nil {
		errors = append(errors, err.Error())
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}

	connectionDetailsValid = true

	// For Firecrawl, we don't make a test request to avoid consuming credits
	// Instead, we validate the configuration and assume it will work if the API key format is valid
	apiKey, ok := details["api_key"].(string)
	if !ok || apiKey == "" {
		errors = append(errors, "API key is required")
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}

	// Basic API key format validation (Firecrawl keys typically start with "fc-")
	if len(apiKey) < minAPIKeyLength {
		errors = append(errors, "API key appears to be too short")
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}

	// Configuration is valid, assume connection will work
	canConnect = true

	return canConnect, connectionDetailsValid, connectionSettingsValid, errors
}
