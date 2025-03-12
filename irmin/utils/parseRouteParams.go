package utils

import (
	"fmt"

	"github.com/gofiber/fiber/v3" // import the Fiber framework
)

// ParseRouteParams extracts and returns the route parameters for the given keys from a Fiber context.
//
// Parameters:
// - c: The Fiber context containing the route parameters.
// - keys: A slice of strings representing the required parameter names.
//
// Returns:
// - A map containing the required route parameters.
// - An error if one or more required parameters are missing.
func ParseRouteParams(c fiber.Ctx, keys []string) (map[string]string, error) {
	params := make(map[string]string)
	for _, key := range keys {
		// Retrieve the route parameter from the context.
		value := c.Params(key)
		if value == "" {
			return nil, fmt.Errorf("missing required route parameter: %s", key)
		}
		params[key] = value
	}
	return params, nil
}
