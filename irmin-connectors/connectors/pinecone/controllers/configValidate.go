package pineconecontrollers

import (
	"fmt"

	pineconeclient "irmin-connectors/connectors/pinecone/client"
	pineconeconfig "irmin-connectors/connectors/pinecone/config"
	pineconemodels "irmin-connectors/connectors/pinecone/models"

	"github.com/gofiber/fiber/v3"
)

// ConfigValidate godoc
// @Summary Validate Pinecone connector configuration
// @Description Validate Pinecone connection details and settings by testing the actual connection to the Pinecone index
// @Tags pinecone
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param details[api_key] formData string true "Pinecone API key"
// @Param settings[host] formData string true "Pinecone index host URL"
// @Param settings[namespace] formData string false "Target namespace within the index"
// @Success 200 {object} irminmodels.ConnectorConfigurationValidationResult "Configuration validation result"
// @Failure 400 {object} fiber.Map "Bad request - invalid configuration data"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /pinecone/configuration/validate [post]
func (cs *Controllers) ConfigValidate(c fiber.Ctx) error {
	return cs.HandleConfigValidation(c, cs)
}

// GetRequiredFormFields implements the ConfigValidationProvider interface.
func (cs *Controllers) GetRequiredFormFields() ([]string, []string) {
	return pineconeconfig.GetRequiredFields(), pineconeconfig.GetOptionalFields()
}

// ValidateFields implements the ConfigValidationProvider interface.
func (cs *Controllers) ValidateFields(_ fiber.Ctx, details map[string]any, _ map[string]any) []string {
	var errors []string

	// Use the model for validation
	_, err := pineconemodels.NewConnectionDetailsFromMap(details)
	if err != nil {
		errors = append(errors, err.Error())
	}

	return errors
}

// TestConnection implements the ConfigValidationProvider interface.
func (cs *Controllers) TestConnection(
	_ fiber.Ctx,
	details map[string]any,
	settings map[string]any,
) (bool, bool, bool, []string) {
	var errors []string
	canConnect := false
	connectionDetailsValid := false
	connectionSettingsValid := false

	// Parse connection details using model
	connectionDetails, err := pineconemodels.NewConnectionDetailsFromMap(details)
	if err != nil {
		errors = append(errors, fmt.Sprintf("Invalid connection details: %v", err))
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}

	// Parse connection settings using model
	connectionSettings, err := pineconemodels.NewConnectionSettingsFromMap(settings)
	if err != nil {
		errors = append(errors, fmt.Sprintf("Invalid connection settings: %v", err))
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}

	// Test connection to Pinecone
	err = pineconeclient.ValidateConnection(
		connectionDetails.APIKey,
		connectionSettings.Host,
		connectionSettings.Namespace,
	)
	if err != nil {
		errors = append(errors, fmt.Sprintf("Failed to connect to Pinecone: %v", err))
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}

	canConnect = true
	connectionDetailsValid = true
	connectionSettingsValid = true

	return canConnect, connectionDetailsValid, connectionSettingsValid, errors
}
