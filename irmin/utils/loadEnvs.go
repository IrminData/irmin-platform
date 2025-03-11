package utils

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

// DataEngineEnv is a struct that holds the environment variables for the data engine.
type DataEngineEnv struct {
	Port                     string // Port to run the Core API server on
	URL                      string // URL of the Core API server
	SystemToken              string // Token to authenticate system requests to the API
	DatabaseConnectionString string // Postgres DB connection string
	DataEngineURL            string // URL of the Data Engine API server
	DataEngineToken          string // Token to authenticate system level requests to the Data Engine API
	S3Endpoint               string // Endpoint of the S3-compatible object store
	S3Bucket                 string // Bucket name of the S3-compatible object store
	S3Folder                 string // Base folder name of the S3-compatible object store
	S3Region                 string // Region of the S3-compatible object store
	S3AccessKeyID            string // Access key ID for the S3-compatible object store
	S3AccessSecret           string // Secret access key for the S3-compatible object store
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
// a DataEngineEnv struct with the loaded environment variables.
func LoadEnv() (*DataEngineEnv, error) {
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
	token, err := getEnv("TOKEN", false, "token-undefined")
	if err != nil {
		return nil, err
	}

	databaseConnectionString, err := getEnv("DATABASE_CONNECTION_STRING", true, "")
	if err != nil {
		return nil, err
	}

	dataEngineURL, err := getEnv("DATA_ENGINE_URL", false, "")
	if err != nil {
		return nil, err
	}
	dataEngineToken, err := getEnv("DATA_ENGINE_TOKEN", false, "")
	if err != nil {
		return nil, err
	}

	s3Endpoint, err := getEnv("S3_ENDPOINT", true, "")
	if err != nil {
		return nil, err
	}
	s3Bucket, err := getEnv("S3_BUCKET", true, "")
	if err != nil {
		return nil, err
	}
	s3Folder, err := getEnv("S3_FOLDER", false, "")
	if err != nil {
		return nil, err
	}
	s3Region, err := getEnv("S3_REGION", true, "")
	if err != nil {
		return nil, err
	}
	s3AccessKeyID, err := getEnv("S3_ACCESS_KEY_ID", true, "")
	if err != nil {
		return nil, err
	}
	s3AccessSecret, err := getEnv("S3_ACCESS_SECRET", true, "")
	if err != nil {
		return nil, err
	}

	return &DataEngineEnv{
		Port:                     port,
		URL:                      url,
		SystemToken:              token,
		DatabaseConnectionString: databaseConnectionString,
		DataEngineURL:            dataEngineURL,
		DataEngineToken:          dataEngineToken,
		S3Endpoint:               s3Endpoint,
		S3Bucket:                 s3Bucket,
		S3Folder:                 s3Folder,
		S3Region:                 s3Region,
		S3AccessKeyID:            s3AccessKeyID,
		S3AccessSecret:           s3AccessSecret,
	}, nil
}
