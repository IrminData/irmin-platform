package utils

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3" // import the Fiber framework
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

// ParseArrayFormFields extracts array-like form fields from a Fiber context.
// It groups fields with keys following the pattern prefix[index].key into a map
// where the key is the array index and the value is another map of key-value pairs.
//
// Params:
// - c: The Fiber context containing the form data.
// - prefix: The prefix for the array field (e.g. "trigger").
//
// Returns:
//   - A map where the key is the array index and the value is a map of field names to values.
//   - An error if there is an issue parsing the form data.
func ParseArrayFormFields(c fiber.Ctx, prefix string) (map[int]map[string]string, error) {
	// Compile a regex to match keys like prefix[0].type
	pattern := fmt.Sprintf(`^%s\[(\d+)\]\.(\w+)$`, regexp.QuoteMeta(prefix))
	re, err := regexp.Compile(pattern)
	if err != nil {
		return nil, err
	}

	// Retrieve the full multipart form from the request.
	form, err := c.MultipartForm()
	if err != nil {
		return nil, err
	}

	// Create a map to store results.
	results := make(map[int]map[string]string)

	// Iterate over all form values.
	for key, values := range form.Value {
		matches := re.FindStringSubmatch(key)
		if len(matches) == 3 {
			// Convert the index from string to int.
			idx, err := strconv.Atoi(matches[1])
			if err != nil {
				continue // skip invalid indices
			}
			// If not already present, initialise the map for this index.
			if _, ok := results[idx]; !ok {
				results[idx] = make(map[string]string)
			}
			// Use the first value (assuming one value per field).
			results[idx][matches[2]] = values[0]
		}
	}

	return results, nil
}

// ParseObjectFormFields extracts object-like form fields from a Fiber context.
// It groups fields with keys following the pattern prefix[key] into a map where
// the key is the field name and the value is the field value.
// If no matching fields are found, it returns an empty map.
// Params:
// - c: The Fiber context containing the form data.
// - prefix: The prefix for the object field (e.g. "user").
// Returns:
//   - A map where the key is the field name and the value is the field value.
func ParseObjectFormFields(c fiber.Ctx, prefix string) map[string]string {
	// Create a map to store results.
	results := make(map[string]string)

	// Compile a regex to match keys like prefix[key] (e.g. details[host]).
	pattern := fmt.Sprintf(`^%s\[(\w+)\]$`, regexp.QuoteMeta(prefix))
	re, err := regexp.Compile(pattern)
	if err != nil {
		return results
	}

	// Retrieve the full multipart form from the request.
	form, err := c.MultipartForm()
	if err != nil {
		return results
	}

	// Iterate over all form values.
	for key, values := range form.Value {
		matches := re.FindStringSubmatch(key)
		if len(matches) == 2 {
			results[matches[1]] = values[0]
		}
	}

	// Always return a non-nil map, even if no matching fields were found.
	return results
}
