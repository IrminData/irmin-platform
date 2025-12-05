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
	Port                         string // Port to run the Core API server on
	URL                          string // URL of the Core API server
	SystemToken                  string // Token to authenticate system requests to the API
	CorsEnabled                  bool   // Flag to enable CORS
	HelmetEnabled                bool   // Flag to enable helmet
	IdempotencyEnabled           bool   // Flag to enable idempotency
	AllowedOrigins               string // Allowed origins for CORS
	AIServiceBaseURL             string // Base URL of the AI service
	AIServiceSystemToken         string // Key to authenticate system requests to the AI service
	MCPHTTPPath                  string // Mount path for the embedded MCP streamable HTTP endpoint
	OrchestratorEnabled          bool   // Flag to enable the orchestrator
	SqidAlphabet                 string // Alphabet to use for SQIDs
	DatabaseConnectionString     string // Postgres DB connection string
	ResendAPIKey                 string // Resend API Key for emails
	ConsoleURL                   string // URL of the Irmin Console
	InviteExpiresInDays          int    // Number of days before an invite expires
	ClerkPublicKey               string // Clerk Public API Key
	ClerkSecretKey               string // Clerk Secret API Key
	ClerkSigningKey              string // Clerk Signing Key for JWT
	ClerkSigningAlgorithm        string // Clerk Signing Algorithm for JWT
	NovuSecretKey                string // Novu secret key
	LakeFSURL                    string // URL of the LakeFS instance to connect to
	LakeFSAccessKey              string // Access key for the LakeFS instance
	LakeFSSecretKey              string // Secret key for the LakeFS instance
	LakeFSS3Bucket               string // Bucket name where LakeFS stores repositories
	IrminS3Bucket                string // Bucket name where Irmin stores non-repository objects
	S3Endpoint                   string // Endpoint of the S3-compatible object store
	S3Region                     string // Region of the S3-compatible object store
	S3AccessKeyID                string // Access key ID for the S3-compatible object store
	S3AccessSecret               string // Secret access key for the S3-compatible object store
	SkipOptionalDuckDBExtensions bool   // Flag to skip installation of optional DuckDB extensions
	ComputeSandboxDir            string // Base directory for compute sandbox script execution
	TestConnectorBaseURL         string // Base URL of the connector to test with
	TestConnectorToken           string // Operation token for the connector to test with
	TestConnectorPath            string // Path to the test file in the connector
	TestObjectName               string // Name of the test object which is expected to be a structured JSON file
	TestUserEmail                string // Email of the test user
	TestWorkspace                string // Workspace to test with
	TestRepository               string // Repository to test with
	TestBranch                   string // Branch to test with
	TestTag                      string // Tag to test with
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
			if setEnvErr := os.Setenv(key, defaultVal); setEnvErr != nil {
				return "", fmt.Errorf("failed to set environment variable: %w", setEnvErr)
			}
			return defaultVal, nil
		}
	}
	return val, nil
}

// validateJWTAlgorithm validates that the provided JWT algorithm is supported.
func validateJWTAlgorithm(algorithm string) error {
	if !IsJWTAlgorithmSupported(algorithm) {
		return fmt.Errorf(
			"unsupported JWT algorithm '%s'. Supported algorithms: %v",
			algorithm,
			GetSupportedJWTAlgorithms(),
		)
	}
	return nil
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
// a CoreAPIEnv struct with the loaded environment variables.
//
//nolint:gocognit,gocyclo,cyclop,funlen // We are just loading and checking every single env var, nothing complex here
func LoadEnv() (*CoreAPIEnv, error) {
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
	token, err := getEnv("TOKEN", false, "token-undefined")
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
	idempotencyEnabledStr, err := getEnv("IDEMPOTENCY_ENABLED", false, "false")
	if err != nil {
		return nil, err
	}
	idempotencyEnabled, err := strconv.ParseBool(idempotencyEnabledStr)
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
	allowedOrigins, err := getEnv("ALLOWED_ORIGINS", false, "https://localhost:3000")
	if err != nil {
		return nil, err
	}

	aiServiceBaseURL, err := getEnv("AI_SERVICE_BASE_URL", true, "")
	if err != nil {
		return nil, err
	}
	aiServiceSystemToken, err := getEnv("AI_SERVICE_SYSTEM_TOKEN", true, "")
	if err != nil {
		return nil, err
	}

	mcpHTTPPath, err := getEnv("MCP_HTTP_PATH", false, "/mcp")
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

	// Validate that the configured JWT algorithm is supported
	if validateJWTAlgorithmErr := validateJWTAlgorithm(clerkSigningAlgorithm); validateJWTAlgorithmErr != nil {
		return nil, fmt.Errorf("CLERK_SIGNING_ALGORITHM validation failed: %w", validateJWTAlgorithmErr)
	}

	novuSecretKey, err := getEnv("NOVU_SECRET_KEY", true, "")
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
	lakefsS3Bucket, err := getEnv("LAKE_FS_S3_BUCKET", false, "")
	if err != nil {
		return nil, err
	}

	irminS3Bucket, err := getEnv("IRMIN_S3_BUCKET", false, "")
	if err != nil {
		return nil, err
	}

	s3Endpoint, err := getEnv("S3_ENDPOINT", true, "")
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
	testUserEmail, err := getEnv("TEST_USER_EMAIL", false, "")
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

	skipOptionalDuckDBExtensionsStr, err := getEnv("SKIP_OPTIONAL_DUCKDB_EXTENSIONS", false, "false")
	if err != nil {
		return nil, err
	}
	skipOptionalDuckDBExtensions, err := strconv.ParseBool(skipOptionalDuckDBExtensionsStr)
	if err != nil {
		return nil, err
	}

	computeSandboxDir, err := getEnv("IRMIN_COMPUTE_SANDBOX_DIR", false, "./tmp/sandbox")
	if err != nil {
		return nil, err
	}

	return &CoreAPIEnv{
		Port:                         port,
		URL:                          url,
		SystemToken:                  token,
		CorsEnabled:                  corsEnabled,
		HelmetEnabled:                helmetEnabled,
		IdempotencyEnabled:           idempotencyEnabled,
		AllowedOrigins:               allowedOrigins,
		AIServiceBaseURL:             aiServiceBaseURL,
		AIServiceSystemToken:         aiServiceSystemToken,
		MCPHTTPPath:                  mcpHTTPPath,
		OrchestratorEnabled:          orchestratorEnabled,
		SqidAlphabet:                 sqidAlphabet,
		DatabaseConnectionString:     databaseConnectionString,
		ResendAPIKey:                 resendAPIKey,
		ConsoleURL:                   consoleURL,
		InviteExpiresInDays:          inviteExpiresInDays,
		ClerkPublicKey:               clerkPublicKey,
		ClerkSecretKey:               clerkSecretKey,
		ClerkSigningKey:              clerkSigningKey,
		ClerkSigningAlgorithm:        clerkSigningAlgorithm,
		NovuSecretKey:                novuSecretKey,
		LakeFSURL:                    lakefsURL,
		LakeFSAccessKey:              lakefsAccessKey,
		LakeFSSecretKey:              lakefsSecretKey,
		LakeFSS3Bucket:               lakefsS3Bucket,
		IrminS3Bucket:                irminS3Bucket,
		S3Endpoint:                   s3Endpoint,
		S3Region:                     s3Region,
		S3AccessKeyID:                s3AccessKeyID,
		S3AccessSecret:               s3AccessSecret,
		SkipOptionalDuckDBExtensions: skipOptionalDuckDBExtensions,
		ComputeSandboxDir:            computeSandboxDir,
		TestConnectorBaseURL:         testConnectorBaseURL,
		TestConnectorToken:           testConnectorToken,
		TestConnectorPath:            testConnectorPath,
		TestObjectName:               testObjectName,
		TestUserEmail:                testUserEmail,
		TestWorkspace:                testWorkspace,
		TestRepository:               testRepository,
		TestBranch:                   testBranch,
		TestTag:                      testTag,
	}, nil
}
