package utils

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v3" // import the Fiber framework
)

// ParseQueryParams parses the query parameters from a Fiber context,
// retrieving both required and optional parameters.
//
// Params:
// - c: The Fiber context containing the query parameters.
// - required: A slice of strings representing the required parameter names.
// - optional: A slice of strings representing the optional parameter names.
//
// Returns:
//   - A map where the key is the parameter name and the value is the parameter value.
//     The map will include all required parameters and any optional parameters that are present.
//   - An error if any required parameters are missing.
func ParseQueryParams(c fiber.Ctx, required, optional []string) (map[string]string, error) {
	params := make(map[string]string)
	missingRequired := []string{}

	// Check required parameters.
	for _, param := range required {
		value := c.Query(param) // Retrieve the query parameter from the Fiber context.
		if value == "" {
			missingRequired = append(missingRequired, param)
		} else {
			params[param] = value
		}
	}

	// If any required parameters are missing, return an error.
	if len(missingRequired) > 0 {
		return nil, fmt.Errorf("missing required parameters: %s", strings.Join(missingRequired, ", "))
	}

	// Retrieve optional parameters if present.
	for _, param := range optional {
		value := c.Query(param)
		if value != "" {
			params[param] = value
		}
	}

	return params, nil
}
