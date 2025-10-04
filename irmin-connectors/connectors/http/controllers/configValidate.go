package httpcontrollers

import (
	"encoding/json"
	"fmt"
	"irmin-connectors/connectors/http/client"
	httpconfig "irmin-connectors/connectors/http/config"
	"irmin-connectors/db"

	"github.com/gofiber/fiber/v3"
	"gorm.io/datatypes"
)

// ConfigValidate godoc
// @Summary Validate HTTP connector configuration
// @Description Validate HTTP endpoint configuration by testing the connection to the specified URL
// @Tags http
// @Security SystemTokenAuth
// @Accept multipart/form-data
// @Produce json
// @Param details[url] formData string true "HTTP endpoint URL"
// @Param details[method] formData string true "HTTP method (GET, POST, PUT, PATCH, DELETE)"
// @Param details[headers] formData string false "HTTP headers as JSON object"
// @Param details[body] formData string false "Request body content"
// @Param details[timeout] formData integer false "Request timeout in seconds (default: 30)"
// @Param details[verify_ssl] formData boolean false "Verify SSL certificates (default: true)"
// @Success 200 {object} irminmodels.ConnectorConfigurationValidationResult "Configuration validation result"
// @Failure 400 {object} fiber.Map "Bad request - invalid configuration data"
// @Failure 401 {object} fiber.Map "Unauthorized - invalid or missing authentication"
// @Failure 500 {object} fiber.Map "Internal server error"
// @Router /http/configuration/validate [post]
func (cs *Controllers) ConfigValidate(c fiber.Ctx) error {
	return cs.HandleConfigValidation(c, cs)
}

// GetRequiredFormFields implements the ConfigValidationProvider interface.
func (cs *Controllers) GetRequiredFormFields() ([]string, []string) {
	return httpconfig.GetRequiredFields(), httpconfig.GetOptionalFields()
}

// ValidateFields implements the ConfigValidationProvider interface.
func (cs *Controllers) ValidateFields(_ fiber.Ctx, details map[string]any, _ map[string]any) []string {
	var errors []string

	// Validate the configuration using the HTTP client validation
	if err := client.ValidateConfiguration(details); err != nil {
		errors = append(errors, err.Error())
	}

	return errors
}

// TestConnection implements the ConfigValidationProvider interface.
func (cs *Controllers) TestConnection(
	ctx fiber.Ctx,
	details map[string]any,
	settings map[string]any,
) (bool, bool, bool, []string) {
	var errors []string
	canConnect := false
	connectionDetailsValid := false
	connectionSettingsValid := true // HTTP settings are always valid

	// Validate configuration first
	if err := client.ValidateConfiguration(details); err != nil {
		errors = append(errors, fmt.Sprintf("Invalid configuration: %v", err))
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}

	connectionDetailsValid = true

	// Test the HTTP connection by making a request
	// Create a temporary operation for testing
	detailsJSON, err := json.Marshal(details)
	if err != nil {
		errors = append(errors, fmt.Sprintf("Failed to marshal details: %v", err))
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}

	testOperation := &db.Operation{
		Details: datatypes.JSON(detailsJSON),
	}

	// Initialize HTTP client
	httpClient, err := client.InitHTTPClient(ctx, cs.Logger, testOperation)
	if err != nil {
		errors = append(errors, fmt.Sprintf("Failed to initialize HTTP client: %v", err))
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}

	// Make a test request
	resp, err := httpClient.MakeRequest()
	if err != nil {
		errors = append(errors, fmt.Sprintf("Failed to connect to HTTP endpoint: %v", err))
		return canConnect, connectionDetailsValid, connectionSettingsValid, errors
	}
	defer resp.Body.Close()

	// Check if the response status code is accepted based on user configuration
	if httpClient.IsAcceptedStatusCode(resp.StatusCode) {
		canConnect = true
	} else {
		// Try to read error response body for more context
		errorBody, bodyErr := httpClient.GetResponseBody(resp)
		if bodyErr != nil {
			errors = append(errors, fmt.Sprintf("HTTP endpoint returned unaccepted status %d: %s", resp.StatusCode, resp.Status))
		} else {
			errors = append(errors, fmt.Sprintf("HTTP endpoint returned unaccepted status %d: %s, response: %s",
				resp.StatusCode, resp.Status, string(errorBody)))
		}
	}

	return canConnect, connectionDetailsValid, connectionSettingsValid, errors
}
