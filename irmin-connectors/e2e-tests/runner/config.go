package runner

import (
	"encoding/json"
	"fmt"
	"os"
)

// TestConfig represents the test configuration structure.
type TestConfig struct {
	Connectors map[string]ConnectorConfig `json:"connectors"`
}

// ConnectorConfig represents configuration for a single connector.
type ConnectorConfig struct {
	Enabled     bool              `json:"enabled"`
	URL         string            `json:"url"`
	SystemToken string            `json:"systemToken"`
	Details     map[string]string `json:"details"`
	Settings    map[string]string `json:"settings"`
	TestData    TestDataConfig    `json:"testData"`
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
