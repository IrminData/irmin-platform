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
	OpenAIAPIKey                 string // Key to authenticate system requests to the OpenAI API
	MCPHTTPPath                  string // Mount path for the embedded MCP streamable HTTP endpoint
	OrchestratorEnabled          bool   // Flag to enable the orchestrator
	SqidAlphabet                 string // Alphabet to use for SQIDs
	DatabaseConnectionString     string // Postgres DB connection string
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
	DaytonaAPIKey                string // API key for Daytona sandbox service
	DaytonaAPIURL                string // Base URL for Daytona sandbox service API
	TestConnectorBaseURL         string // Base URL of the connector to test with
	TestConnectorToken           string // Operation token for the connector to test with
	TestConnectorPath            string // Path to the test file in the connector
	TestObjectName               string // Name of the test object which is expected to be a structured JSON file
	TestUserEmail                string // Email of the test user
	TestWorkspace                string // Workspace to test with
	TestRepository               string // Repository to test with
	TestBranch                   string // Branch to test with
	TestTag                      string // Tag to test with
	SignedURLSecret              string // HMAC secret for signed download URLs

	// Billing configuration
	BillingEnabled     bool   // Flag to enable Polar.sh billing integration
	PolarAPIKey        string // Polar.sh API key
	PolarWebhookSecret string // Polar.sh webhook signing secret
	PolarProductID     string // Polar product ID for the usage-based plan
	PolarBaseURL       string // Polar API base URL (default: https://api.polar.sh, sandbox: https://sandbox-api.polar.sh)

	// Sentry error tracking configuration
	SentryEnabled          bool    // Flag to enable Sentry error tracking
	SentryDSN              string  // Sentry DSN for error reporting
	SentryEnvironment      string  // Sentry environment name (default "development")
	SentryTracesSampleRate float64 // Sentry traces sample rate (default 0.1)

	// File size management thresholds
	MaxRequestBodySizeMB       int // Maximum request body size in MB (default 100)
	MaxInMemorySizeMB          int // Max file size to load fully into memory in MB (default 20)
	MaxStreamSizeMB            int // Max file size for streaming through API in MB (default 500)
	MaxAsyncJobSizeMB          int // Size above which async jobs are required in MB (default 5000)
	MaxWorkflowInputFileSizeMB int // Max input file size for workflow actions in MB (default 500)
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
	token, err := getEnv("TOKEN", true, "")
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
	openAIAPIKey, err := getEnv("OPENAI_API_KEY", false, "")
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

	signedURLSecret, err := getEnv("SIGNED_URL_SECRET", false, "")
	if err != nil {
		return nil, err
	}

	maxRequestBodySizeMBStr, err := getEnv("MAX_REQUEST_BODY_SIZE_MB", false, "100")
	if err != nil {
		return nil, err
	}
	maxRequestBodySizeMB, err := strconv.Atoi(maxRequestBodySizeMBStr)
	if err != nil {
		return nil, fmt.Errorf("invalid MAX_REQUEST_BODY_SIZE_MB: %w", err)
	}

	maxInMemorySizeMBStr, err := getEnv("MAX_IN_MEMORY_SIZE_MB", false, "20")
	if err != nil {
		return nil, err
	}
	maxInMemorySizeMB, err := strconv.Atoi(maxInMemorySizeMBStr)
	if err != nil {
		return nil, fmt.Errorf("invalid MAX_IN_MEMORY_SIZE_MB: %w", err)
	}

	maxStreamSizeMBStr, err := getEnv("MAX_STREAM_SIZE_MB", false, "500")
	if err != nil {
		return nil, err
	}
	maxStreamSizeMB, err := strconv.Atoi(maxStreamSizeMBStr)
	if err != nil {
		return nil, fmt.Errorf("invalid MAX_STREAM_SIZE_MB: %w", err)
	}

	maxAsyncJobSizeMBStr, err := getEnv("MAX_ASYNC_JOB_SIZE_MB", false, "5000")
	if err != nil {
		return nil, err
	}
	maxAsyncJobSizeMB, err := strconv.Atoi(maxAsyncJobSizeMBStr)
	if err != nil {
		return nil, fmt.Errorf("invalid MAX_ASYNC_JOB_SIZE_MB: %w", err)
	}

	maxWorkflowInputFileSizeMBStr, err := getEnv("MAX_WORKFLOW_INPUT_FILE_SIZE_MB", false, "500")
	if err != nil {
		return nil, err
	}
	maxWorkflowInputFileSizeMB, err := strconv.Atoi(maxWorkflowInputFileSizeMBStr)
	if err != nil {
		return nil, fmt.Errorf("invalid MAX_WORKFLOW_INPUT_FILE_SIZE_MB: %w", err)
	}

	skipOptionalDuckDBExtensionsStr, err := getEnv("SKIP_OPTIONAL_DUCKDB_EXTENSIONS", false, "false")
	if err != nil {
		return nil, err
	}
	skipOptionalDuckDBExtensions, err := strconv.ParseBool(skipOptionalDuckDBExtensionsStr)
	if err != nil {
		return nil, err
	}

	daytonaAPIKey, err := getEnv("DAYTONA_API_KEY", false, "")
	if err != nil {
		return nil, err
	}
	daytonaAPIURL, err := getEnv("DAYTONA_API_URL", false, "https://app.daytona.io/api")
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

	billingEnabledStr, err := getEnv("BILLING_ENABLED", false, "false")
	if err != nil {
		return nil, err
	}
	billingEnabled, err := strconv.ParseBool(billingEnabledStr)
	if err != nil {
		return nil, err
	}
	polarAPIKey, err := getEnv("POLAR_API_KEY", false, "")
	if err != nil {
		return nil, err
	}
	polarWebhookSecret, err := getEnv("POLAR_WEBHOOK_SECRET", false, "")
	if err != nil {
		return nil, err
	}
	polarProductID, err := getEnv("POLAR_PRODUCT_ID", false, "")
	if err != nil {
		return nil, err
	}
	polarBaseURL, err := getEnv("POLAR_BASE_URL", false, "https://api.polar.sh")
	if err != nil {
		return nil, err
	}

	// Validate that required Polar env vars are set when billing is enabled
	if billingEnabled {
		if billingErr := validateBillingEnvVars(polarAPIKey, polarWebhookSecret, polarProductID); billingErr != nil {
			return nil, billingErr
		}
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
		OpenAIAPIKey:                 openAIAPIKey,
		MCPHTTPPath:                  mcpHTTPPath,
		OrchestratorEnabled:          orchestratorEnabled,
		SqidAlphabet:                 sqidAlphabet,
		DatabaseConnectionString:     databaseConnectionString,
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
		DaytonaAPIKey:                daytonaAPIKey,
		DaytonaAPIURL:                daytonaAPIURL,
		TestConnectorBaseURL:         testConnectorBaseURL,
		TestConnectorToken:           testConnectorToken,
		TestConnectorPath:            testConnectorPath,
		TestObjectName:               testObjectName,
		TestUserEmail:                testUserEmail,
		TestWorkspace:                testWorkspace,
		TestRepository:               testRepository,
		TestBranch:                   testBranch,
		TestTag:                      testTag,
		SignedURLSecret:              signedURLSecret,
		MaxRequestBodySizeMB:         maxRequestBodySizeMB,
		MaxInMemorySizeMB:            maxInMemorySizeMB,
		MaxStreamSizeMB:              maxStreamSizeMB,
		MaxAsyncJobSizeMB:            maxAsyncJobSizeMB,
		MaxWorkflowInputFileSizeMB:   maxWorkflowInputFileSizeMB,
		SentryEnabled:                sentryEnabled,
		SentryDSN:                    sentryDSN,
		SentryEnvironment:            sentryEnvironment,
		SentryTracesSampleRate:       sentryTracesSampleRate,
		BillingEnabled:               billingEnabled,
		PolarAPIKey:                  polarAPIKey,
		PolarWebhookSecret:           polarWebhookSecret,
		PolarProductID:               polarProductID,
		PolarBaseURL:                 polarBaseURL,
	}, nil
}

// validateBillingEnvVars checks that all required Polar env vars are set when billing is enabled.
func validateBillingEnvVars(apiKey, webhookSecret, productID string) error {
	required := map[string]string{
		"POLAR_API_KEY":        apiKey,
		"POLAR_WEBHOOK_SECRET": webhookSecret,
		"POLAR_PRODUCT_ID":     productID,
	}

	var missing []string
	for name, val := range required {
		if val == "" {
			missing = append(missing, name)
		}
	}

	if len(missing) > 0 {
		return fmt.Errorf("billing is enabled but required env vars are missing: %v", missing)
	}
	return nil
}
