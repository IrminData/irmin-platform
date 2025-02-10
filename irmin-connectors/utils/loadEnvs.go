package utils

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

// ConnectorsEnv is a struct that holds the environment variables for the connectors server.
type ConnectorsEnv struct {
	Port       string // Port to run the connectors server on
	URL        string // URL of the connectors server
	APIBaseURL string // Base URL of the Irmin Core API
	APIToken   string // Token to authenticate system requests to the Irmin Core API
}

// getEnv retrieves a single environment variable. If required and missing, returns an error.
func getEnv(key string, required bool, defaultVal string) (string, error) {
	val := os.Getenv(key)
	if val == "" {
		if required {
			return "", fmt.Errorf("missing required environment variable: %s", key)
		}
		// Set default if applicable.
		if defaultVal != "" {
			os.Setenv(key, defaultVal)
			return defaultVal, nil
		}
	}
	return val, nil
}

// LoadRootEnv loads environment variables from the .env file in the project root.
func LoadRootEnv() error {
	rootDir, err := FindProjectRoot()
	if err != nil {
		return fmt.Errorf("failed to find project root: %w", err)
	}
	// Change working directory to rootDir
	if err := os.Chdir(rootDir); err != nil {
		return fmt.Errorf("failed to change working directory: %w", err)
	}
	// Explicitly load the .env file from the project root
	envPath := filepath.Join(rootDir, ".env")
	if err := godotenv.Load(envPath); err != nil {
		return fmt.Errorf("failed to load .env file from %s: %w", envPath, err)
	}
	return nil
}

// LoadEnv loads environment variables from the .env file in the project root,
// sets default values for required system variables if not present, and returns
// a ConnectorsEnv struct with the loaded environment variables.
func LoadEnv() (*ConnectorsEnv, error) {
	// Load environment variables from .env file
	if err := LoadRootEnv(); err != nil {
		return nil, err
	}

	port, err := getEnv("PORT", false, "8080")
	if err != nil {
		return nil, err
	}
	url, err := getEnv("URL", false, "http://localhost:"+port)
	if err != nil {
		return nil, err
	}

	apiBaseURL, err := getEnv("IRMIN_API_BASE_URL", true, "")
	if err != nil {
		return nil, err
	}
	apiToken, err := getEnv("IRMIN_API_TOKEN", true, "")
	if err != nil {
		return nil, err
	}

	return &ConnectorsEnv{
		Port:       port,
		URL:        url,
		APIBaseURL: apiBaseURL,
		APIToken:   apiToken,
	}, nil
}
