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
	HelmetEnabled            bool   // Whether helmet is enabled
	CorsEnabled              bool   // Whether CORS is enabled
	CorsOrigins              string // Origins allowed to access the connectors server
	UniversalConnectorAPIKey string // Universal API Key for all connectors.
	APIBaseURL               string // APIBaseURL is the canonical Core base URL — host only, no path
	APIToken                 string // Token to authenticate system requests to the Irmin Core API
	DatabaseConnectionString string // Connection string for the database
	// Sentry — SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN are read
	// directly from the environment by release tagging / CI scripts, not by
	// the running service, so they are intentionally not loaded here.
	SentryEnabled          bool    // Flag to enable Sentry error tracking
	SentryDSN              string  // Sentry DSN for error reporting
	SentryEnvironment      string  // Sentry environment name (default "development")
	SentryTracesSampleRate float64 // Sentry traces sample rate (default 0.1)
}

// SDKBaseURL returns the Core base URL formatted for the Go SDK
// `api.NewClient` constructor, which expects a base of the form
// `https://host/api` (the SDK's endpoint constants are `/v1/...` and the
// Request method does a literal string concat). Callers that POST to
// system endpoints directly (the OAuth token client) use APIBaseURL
// instead because those callers append the full `/api/v1/...` path.
//
// Keeping the conversion here means env value normalization stays in one
// place — APIBaseURL is canonical, and any "this caller needs a different
// shape" knowledge lives next to the env definition rather than scattered
// across SDK callsites.
func (e *ConnectorsEnv) SDKBaseURL() string {
	return e.APIBaseURL + "/api"
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
//
//nolint:funlen // We are just loading and checking every single env var, nothing complex here
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

	universalConnectorAPIKey, err := getEnv("UNIVERSAL_CONNECTOR_API_KEY", false, "")
	if err != nil {
		return nil, err
	}

	apiBaseURL, err := getEnv("IRMIN_API_BASE_URL", true, "")
	if err != nil {
		return nil, err
	}
	// Strip a trailing slash and any `/api[/v1]` suffix so downstream
	// callers can each append the prefix they need without producing
	// `/api/api/v1/...` paths when the env value was already
	// path-prefixed. Tolerates both shapes: `https://api.example.com`
	// and `https://api.example.com/api`.
	apiBaseURL = NormalizeCoreBaseURL(apiBaseURL)
	apiToken, err := getEnv("IRMIN_API_TOKEN", true, "")
	if err != nil {
		return nil, err
	}

	sentryEnabledStr, err := getEnv("SENTRY_ENABLED", false, "false")
	if err != nil {
		return nil, err
	}
	sentryEnabled, err := strconv.ParseBool(sentryEnabledStr)
	if err != nil {
		return nil, err
	}
	sentryDSN, err := getEnv("SENTRY_DSN", false, "")
	if err != nil {
		return nil, err
	}
	sentryEnvironment, err := getEnv("SENTRY_ENVIRONMENT", false, "development")
	if err != nil {
		return nil, err
	}
	sentryTracesSampleRateStr, err := getEnv("SENTRY_TRACES_SAMPLE_RATE", false, "0.1")
	if err != nil {
		return nil, err
	}
	sentryTracesSampleRate, err := strconv.ParseFloat(sentryTracesSampleRateStr, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid SENTRY_TRACES_SAMPLE_RATE: %w", err)
	}

	dbConnStr, err := getEnv("DATABASE_CONNECTION_STRING", true, "")
	if err != nil {
		return nil, err
	}

	return &ConnectorsEnv{
		Port:                     port,
		URL:                      url,
		HelmetEnabled:            helmetEnabled,
		CorsEnabled:              corsEnabled,
		CorsOrigins:              corsOrigins,
		UniversalConnectorAPIKey: universalConnectorAPIKey,
		APIBaseURL:               apiBaseURL,
		APIToken:                 apiToken,
		DatabaseConnectionString: dbConnStr,
		SentryEnabled:            sentryEnabled,
		SentryDSN:                sentryDSN,
		SentryEnvironment:        sentryEnvironment,
		SentryTracesSampleRate:   sentryTracesSampleRate,
	}, nil
}
