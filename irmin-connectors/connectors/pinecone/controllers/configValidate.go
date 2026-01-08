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
// For validation, only details fields (api_key) are strictly required.
// Settings fields are optional for validation - TestConnection will determine their validity.
func (cs *Controllers) GetRequiredFormFields() ([]string, []string) {
	// Only require details fields for the validation endpoint
	// This allows validating the API key even if settings are incomplete
	requiredDetails := pineconeconfig.GetDetailsFields()

	// All settings fields are optional for validation
	// The TestConnection method will validate them if provided
	optionalSettings := pineconeconfig.GetSettingsFields()

	return requiredDetails, optionalSettings
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

	// Step 1: Validate API key alone by listing indexes
	// This establishes that we CAN connect to Pinecone with these credentials
	err = pineconeclient.ValidateAPIKey(connectionDetails.APIKey)
	if err != nil {
		errors = append(errors, fmt.Sprintf("Invalid API key: %v", err))
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}

	// API key is valid - we can connect to Pinecone
	canConnect = true
	connectionDetailsValid = true

	// Step 2: Parse and validate connection settings (if provided)
	connectionSettings, err := pineconemodels.NewConnectionSettingsFromMap(settings)
	if err != nil {
		// Settings are invalid/incomplete, but details are still valid
		errors = append(errors, fmt.Sprintf("Invalid connection settings: %v", err))
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}

	// Step 3: Test full connection to specific index
	err = pineconeclient.ValidateConnection(
		connectionDetails.APIKey,
		connectionSettings.Host,
		connectionSettings.Namespace,
	)
	if err != nil {
		errors = append(errors, fmt.Sprintf("Failed to connect to index: %v", err))
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}

	// Full connection successful
	connectionSettingsValid = true

	return canConnect, connectionDetailsValid, connectionSettingsValid, errors
}
