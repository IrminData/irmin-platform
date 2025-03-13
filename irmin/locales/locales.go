package locales

import (
	"strings"

	"github.com/gofiber/fiber/v3"
)

type Dictionary map[string]string

// T returns the translation for a given key from the dictionary.
func (d Dictionary) T(key string) string {
	if val, exists := d[key]; exists {
		return val
	}
	// Fallback to the default English dictionary.
	if val, exists := English[key]; exists {
		return val
	}
	// If not found in either, return the key itself.
	return key
}

// GetDictionary retrieves the appropriate dictionary and locale based on the request's language header.
func GetDictionary(c fiber.Ctx) (Dictionary, string) {
	langHeader := c.Get("Accept-Language")
	// Check if the header contains "fi" (case-insensitive) for Finnish.
	if strings.Contains(strings.ToLower(langHeader), "fi") {
		return Finnish, "fi"
	}
	// Default to English.
	return English, "en"
}
