package utils

import (
	"fmt"
	"net/http"
	"strings"
)

// ParseFormFields parses the form data from an HTTP request and checks for required and optional fields.
//
// Params:
// - r: The HTTP request containing the form data.
// - required: A slice of strings representing the required field names.
// - optional: A slice of strings representing the optional field names.
//
// Returns:
//   - A map where the key is the field name and the value is the field value.
//     The map will include all required fields and any optional fields that are present.
//   - An error if any required fields are missing or if form parsing fails.
func ParseFormFields(r *http.Request, required, optional []string) (map[string]string, error) {
	// Parse the form data.
	if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/") {
		// Using a reasonable memory limit (e.g. 10MB).
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			return nil, fmt.Errorf("unable to parse multipart form data: %v", err)
		}
	} else {
		if err := r.ParseForm(); err != nil {
			return nil, fmt.Errorf("unable to parse form data: %v", err)
		}
	}

	values := make(map[string]string)
	missingRequired := []string{}

	// Iterate over required fields and validate each one.
	for _, field := range required {
		value := r.FormValue(field)
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

	// Retrieve optional fields if they are present.
	for _, field := range optional {
		value := r.FormValue(field)
		if value != "" {
			values[field] = value
		}
	}

	return values, nil
}
