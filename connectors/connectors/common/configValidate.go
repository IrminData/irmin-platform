package common

import (
	"irmin-connectors/utils"

	irminmodels "github.com/IrminData/irmin-platform/sdks/go/models"

	"github.com/gofiber/fiber/v3"
)

// ConfigValidationProvider defines the interface for validating connector configurations.
type ConfigValidationProvider interface {
	// GetRequiredFormFields returns the list of required and optional form field names
	GetRequiredFormFields() (required []string, optional []string)

	// ValidateFields performs connector-specific field validation
	ValidateFields(ctx fiber.Ctx, details map[string]any, settings map[string]any) []string

	// TestConnection tests the actual connection and returns status flags and errors
	TestConnection(
		ctx fiber.Ctx,
		details map[string]any,
		settings map[string]any,
	) (canConnect, detailsValid, settingsValid bool, errors []string)
}

// HandleConfigValidation provides a common HTTP handler for configuration validation endpoints.
func (cs *Controllers) HandleConfigValidation(c fiber.Ctx, provider ConfigValidationProvider) error {
	var errors []string

	// Default states
	canConnect := false
	connectionDetailsValid := false
	connectionSettingsValid := false

	// Get required and optional form fields from the provider
	requiredFields, optionalFields := provider.GetRequiredFormFields()

	// Parse form fields
	fields, err := utils.ParseFormFields(c, requiredFields, optionalFields)
	if err != nil {
		errors = append(errors, err.Error())
	}

	// Convert form fields to maps for utility function usage
	details, settings := ConvertFormFieldsToMaps(fields)

	// Validate fields using the provider if no parsing errors
	if len(errors) == 0 {
		validationErrors := provider.ValidateFields(c, details, settings)
		errors = append(errors, validationErrors...)
	}

	// Test connection if no validation errors
	if len(errors) == 0 {
		var connErrors []string
		canConnect, connectionDetailsValid, connectionSettingsValid, connErrors = provider.TestConnection(
			c,
			details,
			settings,
		)
		errors = append(errors, connErrors...)
	}

	// Final "ok" means no errors were accumulated
	ok := (len(errors) == 0) && canConnect && connectionDetailsValid && connectionSettingsValid

	// Build and send the standardized response
	response := irminmodels.ConnectorConfigurationValidationResult{
		OK:                      ok,
		CanConnect:              canConnect,
		ConnectionDetailsValid:  connectionDetailsValid,
		ConnectionSettingsValid: connectionSettingsValid,
		Errors:                  errors,
	}

	return c.Status(fiber.StatusOK).JSON(response)
}

// ConvertFormFieldsToMaps converts form fields into separate details and settings maps.
func ConvertFormFieldsToMaps(fields map[string]string) (map[string]any, map[string]any) {
	details := make(map[string]any)
	settings := make(map[string]any)

	// Separate details and settings fields
	for key, value := range fields {
		if value == "" {
			continue
		}

		switch {
		case len(key) > 8 && key[:8] == "details[" && key[len(key)-1:] == "]":
			fieldName := key[8 : len(key)-1]
			details[fieldName] = value
		case len(key) > 9 && key[:9] == "settings[" && key[len(key)-1:] == "]":
			fieldName := key[9 : len(key)-1]
			settings[fieldName] = value
		case key == "details" || key == "settings":
			// These will be handled by connector-specific logic
			continue
		default:
			// Default to details for unknown format
			details[key] = value
		}
	}

	return details, settings
}
