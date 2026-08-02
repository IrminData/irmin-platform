package locales

import (
	_ "embed"
	"encoding/json"
	"strings"

	"github.com/gofiber/fiber/v3"
)

//go:embed en.json
var enLocaleData []byte

//go:embed fi.json
var fiLocaleData []byte

// Dictionary represents a map of translation keys to their localized strings.
type Dictionary map[string]string

// LocaleManager handles localization for the application.
type LocaleManager struct {
	english Dictionary
	finnish Dictionary
}

// New creates a new LocaleManager instance.
func New() (*LocaleManager, error) {
	lm := &LocaleManager{
		english: make(Dictionary),
		finnish: make(Dictionary),
	}

	if unmarshalEnErr := json.Unmarshal(enLocaleData, &lm.english); unmarshalEnErr != nil {
		return nil, unmarshalEnErr
	}

	if unmarshalFiErr := json.Unmarshal(fiLocaleData, &lm.finnish); unmarshalFiErr != nil {
		return nil, unmarshalFiErr
	}

	return lm, nil
}

// T returns the translation for a given key from the dictionary.
// It falls back to English if the key is not found in the current dictionary.
func (lm *LocaleManager) T(dict Dictionary, key string) string {
	if val, exists := dict[key]; exists {
		return val
	}
	// Fallback to the default English dictionary
	if val, exists := lm.english[key]; exists {
		return val
	}
	// If not found in either, return the key itself
	return key
}

// GetDictionary retrieves the appropriate dictionary and locale based on the request's language header.
func (lm *LocaleManager) GetDictionary(c fiber.Ctx) (Dictionary, string) {
	langHeader := c.Get("Accept-Language")
	// Check if the header contains "fi" (case-insensitive) for Finnish
	if strings.Contains(strings.ToLower(langHeader), "fi") {
		return lm.finnish, "fi"
	}
	// Default to English
	return lm.english, "en"
}
