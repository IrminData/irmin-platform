package utils

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v3"
)

// ParseFormFields parses the form data from a Fiber context and checks for required and optional fields.
//
// Params:
// - c: The Fiber context containing the form data.
// - required: A slice of strings representing the required field names.
// - optional: A slice of strings representing the optional field names.
//
// Returns:
//   - A map where the key is the field name and the value is the field value.
//     The map will include all required fields and any optional fields that are present.
//   - An error if any required fields are missing.
func ParseFormFields(c fiber.Ctx, required, optional []string) (map[string]string, error) {
	values := make(map[string]string)
	missingRequired := []string{}

	// Check required form fields.
	for _, field := range required {
		value := c.FormValue(field) // Retrieve the form value from the context.
		if value == "" {
			missingRequired = append(missingRequired, field)
		} else {
			values[field] = value
		}
	}

	// If any required fields are missing, return an error.
	if len(missingRequired) > 0 {
		return nil, fmt.Errorf("missing required fields: %s", strings.Join(missingRequired, ", "))
	}

	// Retrieve optional fields if present.
	for _, field := range optional {
		value := c.FormValue(field)
		if value != "" {
			values[field] = value
		}
	}

	return values, nil
}
