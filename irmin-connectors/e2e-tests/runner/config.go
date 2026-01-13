package runner

import (
	"encoding/json"
	"fmt"
	"maps"
	"os"
)

// TestConfig represents the test configuration structure.
type TestConfig struct {
	Connectors map[string]ConnectorConfig `json:"connectors"`
}

// OperationConfig represents per-operation configuration overrides.
// Fields specified here will override the base connector config for that operation.
type OperationConfig struct {
	Details  map[string]string `json:"details,omitempty"`
	Settings map[string]string `json:"settings,omitempty"`
}

// ConnectorConfig represents configuration for a single connector.
type ConnectorConfig struct {
	Enabled     bool                       `json:"enabled"`
	URL         string                     `json:"url"`
	SystemToken string                     `json:"systemToken"`
	Details     map[string]string          `json:"details"`
	Settings    map[string]string          `json:"settings"`
	TestData    TestDataConfig             `json:"testData"`
	Operations  map[string]OperationConfig `json:"operations,omitempty"`
}

// TestDataConfig represents test data configuration for a connector.
type TestDataConfig struct {
	PullPath     string `json:"pullPath"`
	PushPath     string `json:"pushPath"`
	PushFile     string `json:"pushFile"`
	PatchFile    string `json:"patchFile"`
	WebhookURL   string `json:"webhookURL"`
	WebhookToken string `json:"webhookToken"`
}

// LoadConfig loads the test configuration from a JSON file.
func LoadConfig(configPath string) (*TestConfig, error) {
	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var config TestConfig
	if unmarshalErr := json.Unmarshal(data, &config); unmarshalErr != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", unmarshalErr)
	}

	return &config, nil
}

// GetEnabledConnectors returns a list of enabled connector names.
func (c *TestConfig) GetEnabledConnectors() []string {
	enabled := make([]string, 0)
	for name, config := range c.Connectors {
		if config.Enabled {
			enabled = append(enabled, name)
		}
	}
	return enabled
}

// GetConnector returns the configuration for a specific connector.
func (c *TestConfig) GetConnector(name string) (ConnectorConfig, bool) {
	config, exists := c.Connectors[name]
	return config, exists
}

// GetOperationConfig returns the merged details and settings for a specific operation.
// It merges the base connector config with any operation-specific overrides.
//
// The operation parameter can be any string. Common values include:
//   - "pull", "push", "patch", "schema", "subscribe" - standard connector operations
//   - "roundtrip" - combined push/pull test
//   - Any other value (e.g., "default") - returns base config without overrides
//
// If no override exists for the given operation, the base config is returned unchanged.
func (c *ConnectorConfig) GetOperationConfig(operation string) (map[string]string, map[string]string) {
	// Start with copies of the base config
	details := copyStringMap(c.Details)
	settings := copyStringMap(c.Settings)

	// If there are operation-specific overrides, merge them
	if c.Operations != nil {
		if opConfig, exists := c.Operations[operation]; exists {
			// Merge operation details (overrides base)
			maps.Copy(details, opConfig.Details)
			// Merge operation settings (overrides base)
			maps.Copy(settings, opConfig.Settings)
		}
	}

	return details, settings
}

// copyStringMap creates a shallow copy of a string map.
func copyStringMap(src map[string]string) map[string]string {
	if src == nil {
		return make(map[string]string)
	}
	dst := make(map[string]string, len(src))
	for k, v := range src {
		dst[k] = v
	}
	return dst
}
