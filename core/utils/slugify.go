package utils

import (
	"regexp"
	"strings"
)

// Slugify converts a given string into a URL-friendly slug.
// It lowercases the input, removes non-alphanumeric characters (except spaces and hyphens),
// replaces spaces and consecutive hyphens with a single hyphen,
// and trims hyphens from the beginning and end of the string.
// Returns the resulting slug.
func Slugify(s string) string {
	// Convert to lower case.
	s = strings.ToLower(s)

	// Remove any character that is not a letter, digit, space or hyphen.
	re := regexp.MustCompile(`[^a-z0-9\s-]`)
	s = re.ReplaceAllString(s, "")

	// Replace multiple spaces or hyphens with a single hyphen.
	re = regexp.MustCompile(`[\s-]+`)
	s = re.ReplaceAllString(s, "-")

	// Trim hyphens from the start and end of the string.
	s = strings.Trim(s, "-")

	return s
}
