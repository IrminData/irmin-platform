package config

import (
	"encoding/json"
	"fmt"
	"os"
)

// ConnectionConfig holds configuration for a test connection.
type ConnectionConfig struct {
	// ConnectorName is the name of the connector to use (e.g., "HTTP", "PostgreSQL", "MySQL").
	// The connector ID will be looked up automatically using GET /connectors.
	ConnectorName string `json:"connector_name"`

	// Details contains connector-specific connection details (credentials, endpoints, etc.).
	Details map[string]any `json:"details"`

	// Settings contains connector-specific settings.
	Settings map[string]any `json:"settings"`

	// ConnectorID is populated at runtime after looking up the connector by name.
	ConnectorID string `json:"-"`
}

// Config holds the configuration for E2E tests.
type Config struct {
	// APIBaseURL is the Irmin API base URL (e.g., "https://api.irmin.co/api").
	APIBaseURL string `json:"api_base_url"`

	// AuthToken is the API token or JWT for authentication.
	AuthToken string `json:"auth_token"`

	// CleanupAfterTests determines whether to clean up test resources after tests complete.
	CleanupAfterTests bool `json:"cleanup_after_tests"`

	// Verbose enables verbose logging.
	Verbose bool `json:"verbose"`

	// Connection is an optional connection configuration for testing connection and workflow operations.
	// If not provided, connection and import/export workflow tests will be skipped.
	Connection *ConnectionConfig `json:"connection,omitempty"`

	// --- Runtime fields (populated by the test runner) ---

	// Workspace is the workspace slug created for tests.
	Workspace string `json:"-"`

	// TestRepository is the shared repository slug created for tests.
	TestRepository string `json:"-"`

	// TestRepositoryID is the SQID of the shared repository created for tests.
	TestRepositoryID string `json:"-"`

	// TestConnection is the connection ID created for tests (if connection config is provided).
	TestConnection string `json:"-"`
}

// LoadConfig loads the configuration from a JSON file.
func LoadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("invalid config: %w", err)
	}

	return &cfg, nil
}

// Validate checks if the configuration is valid.
func (c *Config) Validate() error {
	if c.APIBaseURL == "" {
		return fmt.Errorf("api_base_url is required")
	}
	if c.AuthToken == "" {
		return fmt.Errorf("auth_token is required")
	}
	return nil
}
