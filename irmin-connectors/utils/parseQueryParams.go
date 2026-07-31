package utils

import (
	"fmt"
	"net/http"
	"strings"
)

// ParseQueryParams parses the query parameters from an HTTP request,
// retrieving both required and optional parameters.
//
// Params:
// - r: The HTTP request containing the query parameters.
// - required: A slice of strings representing the required parameter names.
// - optional: A slice of strings representing the optional parameter names.
//
// Returns:
//   - A map where the key is the parameter name and the value is the parameter value.
//     The map will include all required parameters and any optional parameters that are present.
//   - An error if any required parameters are missing.
func ParseQueryParams(r *http.Request, required, optional []string) (map[string]string, error) {
	// Retrieve the query parameters from the URL.
	queryValues := r.URL.Query()

	params := make(map[string]string)
	missingRequired := []string{}

	// Check required parameters.
	for _, param := range required {
		value := queryValues.Get(param)
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
		value := queryValues.Get(param)
		if value != "" {
			params[param] = value
		}
	}

	return params, nil
}
