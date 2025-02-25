package utils

import (
	"fmt"
	"net/http"
	"strings"
)

// ParseRequiredFormFields parses the form data from an HTTP request and checks for required fields.
//
// Params:
// - r: The HTTP request containing the form data.
// - fields: A slice of strings representing the required field names.
//
// Returns:
// - A map where the key is the field name and the value is the field value.
// - An error if any required fields are missing or if form parsing fails.
func ParseRequiredFormFields(r *http.Request, fields []string) (map[string]string, error) {
	// Parse the form data
	if err := r.ParseForm(); err != nil {
		return nil, fmt.Errorf("unable to parse form data: %v", err)
	}

	values := make(map[string]string)
	missingFields := []string{}

	// Iterate over the required fields and validate
	for _, field := range fields {
		value := r.FormValue(field)
		if value == "" {
			missingFields = append(missingFields, field)
		} else {
			values[field] = value
		}
	}

	// If any fields are missing, return an error
	if len(missingFields) > 0 {
		return nil, fmt.Errorf("missing required fields: %s", strings.Join(missingFields, ", "))
	}

	return values, nil
}
