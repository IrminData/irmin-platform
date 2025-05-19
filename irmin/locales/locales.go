package locales

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v3"
)

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

	enData, readEnErr := os.ReadFile(filepath.Join("locales", "en.json"))
	if readEnErr != nil {
		return nil, readEnErr
	}
	if unmarshalEnErr := json.Unmarshal(enData, &lm.english); unmarshalEnErr != nil {
		return nil, unmarshalEnErr
	}

	fiData, readFiErr := os.ReadFile(filepath.Join("locales", "fi.json"))
	if readFiErr != nil {
		return nil, readFiErr
	}
	if unmarshalFiErr := json.Unmarshal(fiData, &lm.finnish); unmarshalFiErr != nil {
		return nil, unmarshalFiErr
	}

	return lm, nil
}

// MustNew creates a new LocaleManager instance and panics if there's an error.
func MustNew() *LocaleManager {
	lm, err := New()
	if err != nil {
		panic("failed to initialize locale manager: " + err.Error())
	}
	return lm
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
