package utils

import (
	"fmt"
	"net/http"
)

// ParseFormFields parses the form data from an HTTP request and extracts the specified field values.
//
// Params:
// - r: The HTTP request containing the form data.
// - fields: A slice of strings representing the field names to extract.
//
// Returns:
// - A map where the key is the field name and the value is the field value (may be empty).
// - An error if the form data cannot be parsed.
func ParseFormFields(r *http.Request, fields []string) (map[string]string, error) {
	// Parse the form data
	if err := r.ParseForm(); err != nil {
		return nil, fmt.Errorf("unable to parse form data: %v", err)
	}

	values := make(map[string]string)

	// Iterate over the fields and extract their values, even if they are empty.
	for _, field := range fields {
		values[field] = r.FormValue(field)
	}

	return values, nil
}
