package utils

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

// DataEngineEnv is a struct that holds the environment variables for the data engine.
type DataEngineEnv struct {
	Port                 string // Port to run the data engine server on
	URL                  string // URL of the data engine server
	Token                string // Token to authenticate system requests to the data engine with
	APIBaseURL           string // Base URL of the Irmin Core API
	APIToken             string // Token to authenticate system requests to the Irmin Core API
	LakeFSURL            string // URL of the LakeFS instance to connect to
	LakeFSAccessKey      string // Access key for the LakeFS instance
	LakeFSSecretKey      string // Secret key for the LakeFS instance
	S3Endpoint           string // Endpoint of the S3-compatible object store
	S3Bucket             string // Bucket name of the S3-compatible object store
	S3Folder             string // Base folder name of the S3-compatible object store
	S3Region             string // Region of the S3-compatible object store
	S3AccessKeyID        string // Access key ID for the S3-compatible object store
	S3AccessSecret       string // Secret access key for the S3-compatible object store
	TestConnectorBaseURL string // Base URL of the connector to test with
	TestConnectorToken   string // Operation token for the connector to test with
	TestConnectorPath    string // Path to the test file in the connector
	TestObjectName       string // Name of the test object which is expected to be a structured JSON file
	TestWorkspace        string // Workspace to test with
	TestRepository       string // Repository to test with
	TestBranch           string // Branch to test with
	TestTag              string // Tag to test with
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

	apiBaseURL, err := getEnv("IRMIN_API_BASE_URL", true, "")
	if err != nil {
		return nil, err
	}
	apiToken, err := getEnv("IRMIN_API_TOKEN", true, "")
	if err != nil {
		return nil, err
	}
	lakefsURL, err := getEnv("LAKE_FS_URL", true, "")
	if err != nil {
		return nil, err
	}
	lakefsAccessKey, err := getEnv("LAKE_FS_ACCESS_KEY_ID", true, "")
	if err != nil {
		return nil, err
	}
	lakefsSecretKey, err := getEnv("LAKE_FS_SECRET_ACCESS_KEY", true, "")
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
	testConnectorBaseURL, err := getEnv("TEST_CONNECTOR_BASE_URL", true, "")
	if err != nil {
		return nil, err
	}
	testConnectorToken, err := getEnv("TEST_CONNECTOR_TOKEN", true, "")
	if err != nil {
		return nil, err
	}
	testConnectorPath, err := getEnv("TEST_CONNECTOR_PATH", true, "")
	if err != nil {
		return nil, err
	}
	testObjectName, err := getEnv("TEST_OBJECT_NAME", true, "")
	if err != nil {
		return nil, err
	}
	testWorkspace, err := getEnv("TEST_WORKSPACE", true, "")
	if err != nil {
		return nil, err
	}
	testRepository, err := getEnv("TEST_REPOSITORY", true, "")
	if err != nil {
		return nil, err
	}
	testBranch, err := getEnv("TEST_BRANCH", true, "")
	if err != nil {
		return nil, err
	}
	testTag, err := getEnv("TEST_TAG", true, "")
	if err != nil {
		return nil, err
	}

	return &DataEngineEnv{
		Port:                 port,
		URL:                  url,
		Token:                token,
		APIBaseURL:           apiBaseURL,
		APIToken:             apiToken,
		LakeFSURL:            lakefsURL,
		LakeFSAccessKey:      lakefsAccessKey,
		LakeFSSecretKey:      lakefsSecretKey,
		S3Endpoint:           s3Endpoint,
		S3Bucket:             s3Bucket,
		S3Folder:             s3Folder,
		S3Region:             s3Region,
		S3AccessKeyID:        s3AccessKeyID,
		S3AccessSecret:       s3AccessSecret,
		TestConnectorBaseURL: testConnectorBaseURL,
		TestConnectorToken:   testConnectorToken,
		TestConnectorPath:    testConnectorPath,
		TestObjectName:       testObjectName,
		TestWorkspace:        testWorkspace,
		TestRepository:       testRepository,
		TestBranch:           testBranch,
		TestTag:              testTag,
	}, nil
}
