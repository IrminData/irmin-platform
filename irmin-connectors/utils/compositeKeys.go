package utils

import (
	"fmt"
	"net/url"
	"strings"
)

// EncodeCompositeKey encodes multiple primary key values into a single string identifier.
// Values containing colon characters are URL-encoded to prevent parsing conflicts.
func EncodeCompositeKey(values []string) string {
	if len(values) == 1 {
		// Single value - encode if it contains special characters
		if strings.ContainsAny(values[0], ":") {
			return url.QueryEscape(values[0])
		}
		return values[0]
	}

	// Multiple values - encode each one that needs encoding
	encodedValues := make([]string, len(values))
	for i, value := range values {
		if strings.ContainsAny(value, ":") {
			encodedValues[i] = url.QueryEscape(value)
		} else {
			encodedValues[i] = value
		}
	}

	return strings.Join(encodedValues, ":")
}

// DecodeCompositeKey decodes a composite key identifier back into individual values.
// This is the counterpart to EncodeCompositeKey and handles URL-encoded values.
func DecodeCompositeKey(identifier string, expectedCount int) ([]string, error) {
	if expectedCount == 1 {
		// Single value - URL decode in case it contains special characters
		if decoded, err := url.QueryUnescape(identifier); err == nil {
			return []string{decoded}, nil
		}
		// If decoding fails, return the original value (backwards compatibility)
		return []string{identifier}, nil
	}

	// Split on colons, but first check if this looks like URL-encoded data
	var values []string
	if strings.Contains(identifier, "%") {
		// Likely URL-encoded - split and decode each part
		encodedValues := strings.Split(identifier, ":")
		values = make([]string, len(encodedValues))
		for i, encodedValue := range encodedValues {
			if decoded, err := url.QueryUnescape(encodedValue); err == nil {
				values[i] = decoded
			} else {
				// If decoding fails, use the original value
				values[i] = encodedValue
			}
		}
	} else {
		// Not URL-encoded - use original split for backwards compatibility
		values = strings.Split(identifier, ":")
	}

	if len(values) != expectedCount {
		return nil, fmt.Errorf(
			"identifier parts (%d) don't match expected count (%d)",
			len(values), expectedCount,
		)
	}

	return values, nil
}
