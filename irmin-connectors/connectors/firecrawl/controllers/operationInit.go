package firecrawlcontrollers

import (
	"irmin-connectors/connectors/common"
	firecrawlconfig "irmin-connectors/connectors/firecrawl/config"

	"github.com/gofiber/fiber/v3"
)

// OperationInit godoc
// @Summary Initialize Firecrawl operation
// @Description Initialize a new Firecrawl operation with connection details and settings, returning an operation token for subsequent requests
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
// @Success 200 {object} fiber.Map "Operation initialized successfully with operation token"
// @Failure 400 {object} fiber.Map "Bad request - invalid operation data"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /firecrawl/operation/init [post]
func (cs *Controllers) OperationInit(c fiber.Ctx) error {
	return cs.HandleOperationInit(c, cs)
}

// GetOperationFormFields implements the OperationInitProvider interface.
func (cs *Controllers) GetOperationFormFields() ([]string, []string) {
	return firecrawlconfig.GetRequiredFields(), firecrawlconfig.GetOptionalFields()
}

// BuildDetails implements the OperationInitProvider interface.
func (cs *Controllers) BuildDetails(fields map[string]string) (map[string]string, error) {
	return common.BuildDetailsFromFields(fields, firecrawlconfig.GetDetailsFieldDefinitions()), nil
}

// BuildSettings implements the OperationInitProvider interface.
func (cs *Controllers) BuildSettings(fields map[string]string) (map[string]string, error) {
	return common.BuildSettingsFromFields(fields, firecrawlconfig.GetSettingsFieldDefinitions()), nil
}
