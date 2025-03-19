package utils

import "regexp"

// ValidateEmail checks if the provided email string is in a valid format.
// It returns true if the email is valid, and false otherwise.
// This regex is simplified and may not account for all valid email address formats.
func ValidateEmail(email string) bool {
	// Define a regular expression pattern for email validation.
	// The pattern matches a sequence of alphanumeric characters and allowed symbols,
	// followed by an '@', a domain, a dot, and a valid top-level domain.
	re := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	return re.MatchString(email)
}

// ValidatePhone checks if the provided phone number string is in a valid format.
// It returns true if the phone number matches the simplified regex pattern.
// The regex allows an optional '+' at the start, followed by digits, spaces, dashes, or parentheses.
func ValidatePhone(phone string) bool {
	// Define a regular expression pattern for phone number validation.
	// The pattern is simplified and may not account for all valid phone number formats.
	re := regexp.MustCompile(`^\+?[0-9\s\-\(\)]{7,}$`)
	return re.MatchString(phone)
}
