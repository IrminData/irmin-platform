package utils

import (
	"fmt"
	"mime/multipart"
	"regexp"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3" // import the Fiber framework
)

// Constants for form field parsing.
const (
	// Number of expected regex matches for array form fields (prefix[index].key).
	expectedArrayMatches = 3
	// Number of expected regex matches for object form fields (prefix[key]).
	expectedObjectMatches = 2
	// Index positions in regex matches.
	arrayIndexPos = 1 // Position of index in array matches
	arrayKeyPos   = 2 // Position of key in array matches
	objectKeyPos  = 1 // Position of key in object matches
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

// ParseArrayFormFields extracts array‑like form fields from a Fiber context.
// It works for both multipart/form-data and application/x-www-form-urlencoded.
// It groups keys like prefix[index].key into a map[index]map[key]value.
//
// Params:
//   - c: the Fiber context containing the form data.
//   - prefix: the prefix for the array field (e.g. "trigger").
//
// Returns:
//   - A map where each key is the array index and each value is a map of field names to values.
//   - An error if there's an issue parsing the form data.
func ParseArrayFormFields(c fiber.Ctx, prefix string) (map[int]map[string]string, error) {
	// prepare the regex to match e.g. "trigger[0].type"
	pattern := fmt.Sprintf(`^%s\[(\d+)\]\.(\w+)$`, regexp.QuoteMeta(prefix))
	re, err := regexp.Compile(pattern)
	if err != nil {
		return nil, err
	}

	// container for all form values
	var values map[string][]string

	contentType := c.Get(fiber.HeaderContentType)
	switch {
	case strings.HasPrefix(contentType, fiber.MIMEApplicationForm):
		// application/x-www-form-urlencoded
		values = make(map[string][]string)
		// use c.Request() to get Fasthttp request, then PostArgs()
		args := c.Request().PostArgs()
		args.VisitAll(func(key, val []byte) {
			k := string(key)
			values[k] = append(values[k], string(val))
		})

	case strings.HasPrefix(contentType, fiber.MIMEMultipartForm):
		// multipart/form-data
		var form *multipart.Form
		form, err = c.MultipartForm()
		if err != nil {
			return nil, err
		}
		values = form.Value

	default:
		// unsupported content type
		return nil, fmt.Errorf("unsupported content type %q", contentType)
	}

	// now apply the same grouping logic
	results := make(map[int]map[string]string)
	for key, vals := range values {
		if matches := re.FindStringSubmatch(key); len(matches) == expectedArrayMatches {
			var idx int
			idx, err = strconv.Atoi(matches[arrayIndexPos])
			if err != nil {
				continue // skip bad indices
			}
			// If not already present, initialise the map for this index.
			if _, ok := results[idx]; !ok {
				results[idx] = make(map[string]string)
			}
			// take the first value if multiple were sent
			results[idx][matches[arrayKeyPos]] = vals[0]
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
		if len(matches) == expectedObjectMatches {
			results[matches[objectKeyPos]] = values[0]
		}
	}

	// Always return a non-nil map, even if no matching fields were found.
	return results
}
