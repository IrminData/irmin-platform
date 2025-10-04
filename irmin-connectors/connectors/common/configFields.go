package common

import (
	"errors"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"

	"github.com/gofiber/fiber/v3"
)

// ConfigFieldProvider defines the interface for providing configuration fields.
type ConfigFieldProvider interface {
	GetDynamicFields(ctx fiber.Ctx, key string, fields map[string]string) (map[string]irminmodels.DynamicField, error)
}

// BuildDetailsFromFields creates a details map from form fields using the provided field definitions.
func BuildDetailsFromFields(
	fields map[string]string,
	definitions map[string]irminmodels.DynamicField,
) map[string]string {
	details := make(map[string]string)
	for fieldName := range definitions {
		value := fields["details["+fieldName+"]"]
		// Only include non-empty values to avoid storing empty strings for optional fields
		if value != "" {
			details[fieldName] = value
		}
	}
	return details
}

// BuildSettingsFromFields creates a settings map from form fields using the provided field definitions.
func BuildSettingsFromFields(
	fields map[string]string,
	definitions map[string]irminmodels.DynamicField,
) map[string]string {
	settings := make(map[string]string)
	for fieldName := range definitions {
		value := fields["settings["+fieldName+"]"]
		// Only include non-empty values to avoid storing empty strings for optional fields
		if value != "" {
			settings[fieldName] = value
		}
	}
	return settings
}

// GetRequiredFieldNames returns field names that are marked as required from both details and settings definitions.
func GetRequiredFieldNames(detailsDefs, settingsDefs map[string]irminmodels.DynamicField) []string {
	var required []string
	for fieldName, fieldDef := range detailsDefs {
		if fieldDef.Required {
			required = append(required, "details["+fieldName+"]")
		}
	}
	for fieldName, fieldDef := range settingsDefs {
		if fieldDef.Required {
			required = append(required, "settings["+fieldName+"]")
		}
	}
	return required
}

// GetOptionalFieldNames returns field names that are marked as optional from both details and settings definitions.
func GetOptionalFieldNames(detailsDefs, settingsDefs map[string]irminmodels.DynamicField) []string {
	var optional []string

	// Add optional detail fields
	for fieldName, fieldDef := range detailsDefs {
		if !fieldDef.Required {
			optional = append(optional, "details["+fieldName+"]")
		}
	}

	// Add optional settings fields
	for fieldName, fieldDef := range settingsDefs {
		if !fieldDef.Required {
			optional = append(optional, "settings["+fieldName+"]")
		}
	}

	return optional
}

// GetDetailsFieldNames returns all detail field names from the provided definitions.
func GetDetailsFieldNames(detailsDefs map[string]irminmodels.DynamicField) []string {
	var fields []string
	for fieldName := range detailsDefs {
		fields = append(fields, "details["+fieldName+"]")
	}
	return fields
}

// GetSettingsFieldNames returns all settings field names from the provided definitions.
func GetSettingsFieldNames(settingsDefs map[string]irminmodels.DynamicField) []string {
	var fields []string
	for fieldName := range settingsDefs {
		fields = append(fields, "settings["+fieldName+"]")
	}
	return fields
}

// HandleConfigFields provides a common HTTP handler for configuration fields endpoints.
func (cs *Controllers) HandleConfigFields(c fiber.Ctx, provider ConfigFieldProvider) error {
	// Get the configuration key from the URL parameter
	key := c.Params("key")

	// Parse form fields if they exist (some connectors may not need them)
	fields := make(map[string]string)
	if c.Method() == "POST" {
		// Parse all form fields into a map
		postArgs := c.Request().PostArgs()
		for key, value := range postArgs.All() {
			fields[string(key)] = string(value)
		}

		// Also try parsing as multipart form
		if form, err := c.MultipartForm(); err == nil {
			for k, v := range form.Value {
				if len(v) > 0 {
					fields[k] = v[0]
				}
			}
		}
	}

	// Get dynamic fields from the provider
	dynamicFields, err := provider.GetDynamicFields(c, key, fields)
	if err != nil {
		cs.Logger.Error("Error getting dynamic fields",
			"key", key,
			"error", err)

		statusCode := fiber.StatusInternalServerError
		fiberErr := &fiber.Error{}
		if errors.As(err, &fiberErr) {
			statusCode = fiberErr.Code
		}

		return c.Status(statusCode).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Return the fields as JSON
	return c.Status(fiber.StatusOK).JSON(dynamicFields)
}

// CreateSelectOptions creates select options from a slice of strings.
func CreateSelectOptions(values []string) []irminmodels.SelectOption {
	options := make([]irminmodels.SelectOption, len(values))
	for i, value := range values {
		options[i] = irminmodels.SelectOption{
			Key:   value,
			Value: value,
		}
	}
	return options
}

// CreateSelectOptionsWithLabels creates select options with custom labels.
func CreateSelectOptionsWithLabels(keyValuePairs map[string]string) []irminmodels.SelectOption {
	options := make([]irminmodels.SelectOption, 0, len(keyValuePairs))
	for key, value := range keyValuePairs {
		options = append(options, irminmodels.SelectOption{
			Key:   key,
			Value: value,
		})
	}
	return options
}
