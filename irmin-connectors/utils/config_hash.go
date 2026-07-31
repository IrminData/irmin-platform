package utils

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"sort"
)

// HashConfigMap generates a deterministic hash from a configuration map.
// Keys are sorted alphabetically before hashing to ensure consistent hashes
// regardless of map iteration order.
func HashConfigMap(config map[string]string) (string, error) {
	if config == nil {
		config = make(map[string]string)
	}

	// Sort keys alphabetically
	keys := make([]string, 0, len(config))
	for k := range config {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	// Build sorted map
	sortedConfig := make(map[string]string, len(config))
	for _, k := range keys {
		sortedConfig[k] = config[k]
	}

	// Marshal to JSON
	configJSON, err := json.Marshal(sortedConfig)
	if err != nil {
		return "", err
	}

	// Generate SHA-256 hash
	hash := sha256.Sum256(configJSON)
	return hex.EncodeToString(hash[:]), nil
}

// HashJSONFields generates a deterministic hash from JSON fields (Details and Settings).
// Both fields are unmarshaled, keys are sorted, and then hashed together.
func HashJSONFields(details, settings []byte) (string, error) {
	// Unmarshal details
	var detailsMap map[string]string
	if len(details) > 0 {
		if err := json.Unmarshal(details, &detailsMap); err != nil {
			return "", err
		}
	}

	// Unmarshal settings
	var settingsMap map[string]string
	if len(settings) > 0 {
		if err := json.Unmarshal(settings, &settingsMap); err != nil {
			return "", err
		}
	}

	// Combine into a single map with prefixes to avoid key collision
	combined := make(map[string]string)
	for k, v := range detailsMap {
		combined["details."+k] = v
	}
	for k, v := range settingsMap {
		combined["settings."+k] = v
	}

	return HashConfigMap(combined)
}
