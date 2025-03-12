package utils

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v3"
)

// ParseHeaders parses the header parameters from a Fiber context,
// retrieving both required and optional headers.
//
// Params:
// - c: The Fiber context containing the headers.
// - required: A slice of strings representing the required header names.
// - optional: A slice of strings representing the optional header names.
//
// Returns:
//   - A map where the key is the header name and the value is the header value.
//     The map will include all required headers and any optional headers that are present.
//   - An error if any required headers are missing.
func ParseHeaders(c fiber.Ctx, required, optional []string) (map[string]string, error) {
	headers := make(map[string]string)
	missingRequired := []string{}

	// Check required headers.
	for _, header := range required {
		value := c.Get(header) // Retrieve the header value from the context.
		if value == "" {
			missingRequired = append(missingRequired, header)
		} else {
			headers[header] = value
		}
	}

	// If any required headers are missing, return an error.
	if len(missingRequired) > 0 {
		return nil, fmt.Errorf("missing required headers: %s", strings.Join(missingRequired, ", "))
	}

	// Retrieve optional headers if present.
	for _, header := range optional {
		value := c.Get(header)
		if value != "" {
			headers[header] = value
		}
	}

	return headers, nil
}
