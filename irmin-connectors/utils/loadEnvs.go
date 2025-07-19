package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"github.com/joho/godotenv"
)

// ConnectorsEnv is a struct that holds the environment variables for the connectors server.
type ConnectorsEnv struct {
	Port                     string // Port to run the connectors server on
	URL                      string // URL of the connectors server
	PreforkEnabled           bool   // Whether prefork is enabled
	HelmetEnabled            bool   // Whether helmet is enabled
	CorsEnabled              bool   // Whether CORS is enabled
	CorsOrigins              string // Origins allowed to access the connectors server
	APIBaseURL               string // Base URL of the Irmin Core API
	APIToken                 string // Token to authenticate system requests to the Irmin Core API
	DatabaseConnectionString string // Connection string for the database
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
			err := os.Setenv(key, defaultVal)
			return defaultVal, err
		}
	}
	return val, nil
}

// loadRootEnv loads environment variables from the .env file in the project root if it exists.
// In production environments like Railway, this file may not exist and that's normal.
func loadRootEnv() {
	rootDir, findErr := FindProjectRoot()
	if findErr != nil {
		return
	}

	envPath := filepath.Join(rootDir, ".env")
	_ = godotenv.Load(envPath)
}

// LoadEnv loads environment variables from the .env file in the project root,
// sets default values for required system variables if not present, and returns
// a ConnectorsEnv struct with the loaded environment variables.
func LoadEnv() (*ConnectorsEnv, error) {
	// Load environment variables from .env file
	loadRootEnv()

	port, err := getEnv("PORT", false, "8080")
	if err != nil {
		return nil, err
	}
	url, err := getEnv("URL", false, "http://localhost:"+port)
	if err != nil {
		return nil, err
	}

	preforkEnabledStr, err := getEnv("PREFORK_ENABLED", false, "false")
	if err != nil {
		return nil, err
	}
	preforkEnabled, err := strconv.ParseBool(preforkEnabledStr)
	if err != nil {
		return nil, err
	}
	helmetEnabledStr, err := getEnv("HELMET_ENABLED", false, "false")
	if err != nil {
		return nil, err
	}
	helmetEnabled, err := strconv.ParseBool(helmetEnabledStr)
	if err != nil {
		return nil, err
	}
	corsEnabledStr, err := getEnv("CORS_ENABLED", false, "false")
	if err != nil {
		return nil, err
	}
	corsEnabled, err := strconv.ParseBool(corsEnabledStr)
	if err != nil {
		return nil, err
	}
	corsOrigins, err := getEnv("CORS_ORIGINS", false, "")
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

	dbConnStr, err := getEnv("DATABASE_CONNECTION_STRING", true, "")
	if err != nil {
		return nil, err
	}

	return &ConnectorsEnv{
		Port:                     port,
		URL:                      url,
		PreforkEnabled:           preforkEnabled,
		HelmetEnabled:            helmetEnabled,
		CorsEnabled:              corsEnabled,
		CorsOrigins:              corsOrigins,
		APIBaseURL:               apiBaseURL,
		APIToken:                 apiToken,
		DatabaseConnectionString: dbConnStr,
	}, nil
}
