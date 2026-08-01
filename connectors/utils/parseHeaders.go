package utils

import (
	"fmt"
	"net/http"
	"strings"
)

// ParseHeaders parses the header parameters from an HTTP request,
// retrieving both required and optional headers.
//
// Params:
// - r: The HTTP request containing the headers.
// - required: A slice of strings representing the required header names.
// - optional: A slice of strings representing the optional header names.
//
// Returns:
//   - A map where the key is the header name and the value is the header value.
//     The map will include all required headers and any optional headers that are present.
//   - An error if any required headers are missing.
func ParseHeaders(r *http.Request, required, optional []string) (map[string]string, error) {
	// Retrieve the headers from the HTTP request.
	headerValues := r.Header

	headers := make(map[string]string)
	missingRequired := []string{}

	// Check required headers.
	for _, header := range required {
		value := headerValues.Get(header) // Get the first value for the header.
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
		value := headerValues.Get(header)
		if value != "" {
			headers[header] = value
		}
	}

	return headers, nil
}
