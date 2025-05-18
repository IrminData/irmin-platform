package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"github.com/joho/godotenv"
)

// CoreAPIEnv is a struct that holds the environment variables for the data engine.
type CoreAPIEnv struct {
	Port                     string // Port to run the Core API server on
	URL                      string // URL of the Core API server
	SystemToken              string // Token to authenticate system requests to the API
	CorsEnabled              bool   // Flag to enable CORS
	PreforkEnabled           bool   // Flag to enable prefork
	HelmetEnabled            bool   // Flag to enable helmet
	CorsOrigins              string // Allowed origins for CORS
	OrchestratorEnabled      bool   // Flag to enable the orchestrator
	SqidAlphabet             string // Alphabet to use for SQIDs
	DatabaseConnectionString string // Postgres DB connection string
	ResendAPIKey             string // Resend API Key for emails
	ConsoleURL               string // URL of the Irmin Console
	InviteExpiresInDays      int    // Number of days before an invite expires
	ClerkPublicKey           string // Clerk Public API Key
	ClerkSecretKey           string // Clerk Secret API Key
	ClerkSigningKey          string // Clerk Signing Key for JWT
	ClerkSigningAlgorithm    string // Clerk Signing Algorithm for JWT
	LakeFSURL                string // URL of the LakeFS instance to connect to
	LakeFSAccessKey          string // Access key for the LakeFS instance
	LakeFSSecretKey          string // Secret key for the LakeFS instance
	S3Endpoint               string // Endpoint of the S3-compatible object store
	S3Bucket                 string // Bucket name of the S3-compatible object store
	S3Folder                 string // Base folder name of the S3-compatible object store
	S3Region                 string // Region of the S3-compatible object store
	S3AccessKeyID            string // Access key ID for the S3-compatible object store
	S3AccessSecret           string // Secret access key for the S3-compatible object store
	TestConnectorBaseURL     string // Base URL of the connector to test with
	TestConnectorToken       string // Operation token for the connector to test with
	TestConnectorPath        string // Path to the test file in the connector
	TestObjectName           string // Name of the test object which is expected to be a structured JSON file
	TestWorkspace            string // Workspace to test with
	TestRepository           string // Repository to test with
	TestBranch               string // Branch to test with
	TestTag                  string // Tag to test with
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
// a CoreAPIEnv struct with the loaded environment variables.
func LoadEnv() (*CoreAPIEnv, error) {
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
	corsOrigins, err := getEnv("CORS_ORIGINS", false, "https://localhost:3000")
	if err != nil {
		return nil, err
	}

	orchestratorEnabledStr, err := getEnv("ORCHESTRATOR_ENABLED", false, "false")
	if err != nil {
		return nil, err
	}
	orchestratorEnabled, err := strconv.ParseBool(orchestratorEnabledStr)
	if err != nil {
		return nil, err
	}

	sqidAlphabet, err := getEnv(
		"SQID_ALPHABET",
		false,
		"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
	)
	if err != nil {
		return nil, err
	}

	databaseConnectionString, err := getEnv("DATABASE_CONNECTION_STRING", true, "")
	if err != nil {
		return nil, err
	}

	resendAPIKey, err := getEnv("RESEND_API_KEY", true, "")
	if err != nil {
		return nil, err
	}

	consoleURL, err := getEnv("CONSOLE_URL", false, "https://console.irmin.dev")
	if err != nil {
		return nil, err
	}

	inviteExpiresInDaysStr, err := getEnv("INVITE_EXPIRES_IN_DAYS", false, "7")
	if err != nil {
		return nil, err
	}
	inviteExpiresInDays, err := strconv.Atoi(inviteExpiresInDaysStr)
	if err != nil {
		return nil, err
	}

	clerkPublicKey, err := getEnv("CLERK_PUBLIC_KEY", true, "")
	if err != nil {
		return nil, err
	}
	clerkSecretKey, err := getEnv("CLERK_SECRET_KEY", true, "")
	if err != nil {
		return nil, err
	}
	clerkSigningKey, err := getEnv("CLERK_SIGNING_KEY", true, "")
	if err != nil {
		return nil, err
	}
	clerkSigningAlgorithm, err := getEnv("CLERK_SIGNING_ALGORITHM", true, "")
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
	s3Bucket, err := getEnv("S3_BUCKET", false, "")
	if err != nil {
		return nil, err
	}
	s3Folder, err := getEnv("S3_FOLDER", true, "")
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

	testConnectorBaseURL, err := getEnv("TEST_CONNECTOR_BASE_URL", false, "")
	if err != nil {
		return nil, err
	}
	testConnectorToken, err := getEnv("TEST_CONNECTOR_TOKEN", false, "")
	if err != nil {
		return nil, err
	}
	testConnectorPath, err := getEnv("TEST_CONNECTOR_PATH", false, "")
	if err != nil {
		return nil, err
	}
	testObjectName, err := getEnv("TEST_OBJECT_NAME", false, "")
	if err != nil {
		return nil, err
	}
	testWorkspace, err := getEnv("TEST_WORKSPACE", false, "")
	if err != nil {
		return nil, err
	}
	testRepository, err := getEnv("TEST_REPOSITORY", false, "")
	if err != nil {
		return nil, err
	}
	testBranch, err := getEnv("TEST_BRANCH", false, "")
	if err != nil {
		return nil, err
	}
	testTag, err := getEnv("TEST_TAG", false, "")
	if err != nil {
		return nil, err
	}

	return &CoreAPIEnv{
		Port:                     port,
		URL:                      url,
		SystemToken:              token,
		CorsEnabled:              corsEnabled,
		PreforkEnabled:           preforkEnabled,
		HelmetEnabled:            helmetEnabled,
		CorsOrigins:              corsOrigins,
		OrchestratorEnabled:      orchestratorEnabled,
		SqidAlphabet:             sqidAlphabet,
		DatabaseConnectionString: databaseConnectionString,
		ResendAPIKey:             resendAPIKey,
		ConsoleURL:               consoleURL,
		InviteExpiresInDays:      inviteExpiresInDays,
		ClerkPublicKey:           clerkPublicKey,
		ClerkSecretKey:           clerkSecretKey,
		ClerkSigningKey:          clerkSigningKey,
		ClerkSigningAlgorithm:    clerkSigningAlgorithm,
		LakeFSURL:                lakefsURL,
		LakeFSAccessKey:          lakefsAccessKey,
		LakeFSSecretKey:          lakefsSecretKey,
		S3Endpoint:               s3Endpoint,
		S3Bucket:                 s3Bucket,
		S3Folder:                 s3Folder,
		S3Region:                 s3Region,
		S3AccessKeyID:            s3AccessKeyID,
		S3AccessSecret:           s3AccessSecret,
		TestConnectorBaseURL:     testConnectorBaseURL,
		TestConnectorToken:       testConnectorToken,
		TestConnectorPath:        testConnectorPath,
		TestObjectName:           testObjectName,
		TestWorkspace:            testWorkspace,
		TestRepository:           testRepository,
		TestBranch:               testBranch,
		TestTag:                  testTag,
	}, nil
}
