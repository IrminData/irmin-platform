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

const (
	defaultInviteExpiresInDays = 7
	defaultPort                = "8080"
	defaultConsoleURL          = "https://console.irmin.dev"
	defaultCorsOrigins         = "https://localhost:3000"
	defaultSqidAlphabet        = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
)

// ServerConfig holds server-related configuration.
type ServerConfig struct {
	Port        string
	URL         string
	SystemToken string
}

// FeatureConfig holds feature flag configuration.
type FeatureConfig struct {
	CorsEnabled         bool
	PreforkEnabled      bool
	HelmetEnabled       bool
	CorsOrigins         string
	OrchestratorEnabled bool
}

// CoreConfig holds core system configuration.
type CoreConfig struct {
	SqidAlphabet             string
	DatabaseConnectionString string
	ResendAPIKey             string
	ConsoleURL               string
	InviteExpiresInDays      int
}

// ClerkConfig holds Clerk authentication configuration.
type ClerkConfig struct {
	PublicKey        string
	SecretKey        string
	SigningKey       string
	SigningAlgorithm string
}

// StorageConfig holds storage-related configuration.
type StorageConfig struct {
	LakeFSURL       string
	LakeFSAccessKey string
	LakeFSSecretKey string
	S3Endpoint      string
	S3Bucket        string
	S3Folder        string
	S3Region        string
	S3AccessKeyID   string
	S3AccessSecret  string
}

// TestConfig holds test-related configuration.
type TestConfig struct {
	ConnectorBaseURL string
	ConnectorToken   string
	ConnectorPath    string
	ObjectName       string
	Workspace        string
	Repository       string
	Branch           string
	Tag              string
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

// getEnvBool retrieves a boolean environment variable.
func getEnvBool(key string) (bool, error) {
	val, err := getEnv(key, false, "false")
	if err != nil {
		return false, err
	}
	return strconv.ParseBool(val)
}

// getEnvInt retrieves an integer environment variable with a default value.
func getEnvInt(key string, defaultVal int) (int, error) {
	val, err := getEnv(key, false, strconv.Itoa(defaultVal))
	if err != nil {
		return 0, err
	}
	return strconv.Atoi(val)
}

// getEnvString retrieves a string environment variable with a default value.
func getEnvString(key string, required bool, defaultVal string) (string, error) {
	return getEnv(key, required, defaultVal)
}

// LoadRootEnv loads environment variables from the .env file in the project root.
func LoadRootEnv() error {
	rootDir, findProjectRootErr := FindProjectRoot()
	if findProjectRootErr != nil {
		return fmt.Errorf("failed to find project root: %w", findProjectRootErr)
	}
	// Change working directory to rootDir
	if chdirErr := os.Chdir(rootDir); chdirErr != nil {
		return fmt.Errorf("failed to change working directory: %w", chdirErr)
	}
	// Explicitly load the .env file from the project root
	envPath := filepath.Join(rootDir, ".env")
	if loadErr := godotenv.Load(envPath); loadErr != nil {
		return fmt.Errorf("failed to load .env file from %s: %w", envPath, loadErr)
	}
	return nil
}

// loadServerConfig loads server-related configuration.
func loadServerConfig() (*ServerConfig, error) {
	port, err := getEnvString("PORT", false, defaultPort)
	if err != nil {
		return nil, err
	}
	url, err := getEnvString("URL", false, "http://localhost:"+port)
	if err != nil {
		return nil, err
	}
	token, err := getEnvString("TOKEN", false, "token-undefined")
	if err != nil {
		return nil, err
	}
	return &ServerConfig{
		Port:        port,
		URL:         url,
		SystemToken: token,
	}, nil
}

// loadFeatureConfig loads feature flag configuration.
func loadFeatureConfig() (*FeatureConfig, error) {
	corsEnabled, err := getEnvBool("CORS_ENABLED")
	if err != nil {
		return nil, err
	}
	preforkEnabled, err := getEnvBool("PREFORK_ENABLED")
	if err != nil {
		return nil, err
	}
	helmetEnabled, err := getEnvBool("HELMET_ENABLED")
	if err != nil {
		return nil, err
	}
	corsOrigins, err := getEnvString("CORS_ORIGINS", false, defaultCorsOrigins)
	if err != nil {
		return nil, err
	}
	orchestratorEnabled, err := getEnvBool("ORCHESTRATOR_ENABLED")
	if err != nil {
		return nil, err
	}
	return &FeatureConfig{
		CorsEnabled:         corsEnabled,
		PreforkEnabled:      preforkEnabled,
		HelmetEnabled:       helmetEnabled,
		CorsOrigins:         corsOrigins,
		OrchestratorEnabled: orchestratorEnabled,
	}, nil
}

// loadCoreConfig loads core system configuration.
func loadCoreConfig() (*CoreConfig, error) {
	sqidAlphabet, err := getEnvString("SQID_ALPHABET", false, defaultSqidAlphabet)
	if err != nil {
		return nil, err
	}
	databaseConnectionString, err := getEnvString("DATABASE_CONNECTION_STRING", true, "")
	if err != nil {
		return nil, err
	}
	resendAPIKey, err := getEnvString("RESEND_API_KEY", true, "")
	if err != nil {
		return nil, err
	}
	consoleURL, err := getEnvString("CONSOLE_URL", false, defaultConsoleURL)
	if err != nil {
		return nil, err
	}
	inviteExpiresInDays, err := getEnvInt("INVITE_EXPIRES_IN_DAYS", defaultInviteExpiresInDays)
	if err != nil {
		return nil, err
	}
	return &CoreConfig{
		SqidAlphabet:             sqidAlphabet,
		DatabaseConnectionString: databaseConnectionString,
		ResendAPIKey:             resendAPIKey,
		ConsoleURL:               consoleURL,
		InviteExpiresInDays:      inviteExpiresInDays,
	}, nil
}

// loadClerkConfig loads Clerk authentication configuration.
func loadClerkConfig() (*ClerkConfig, error) {
	publicKey, err := getEnvString("CLERK_PUBLIC_KEY", true, "")
	if err != nil {
		return nil, err
	}
	secretKey, err := getEnvString("CLERK_SECRET_KEY", true, "")
	if err != nil {
		return nil, err
	}
	signingKey, err := getEnvString("CLERK_SIGNING_KEY", true, "")
	if err != nil {
		return nil, err
	}
	signingAlgorithm, err := getEnvString("CLERK_SIGNING_ALGORITHM", true, "")
	if err != nil {
		return nil, err
	}
	return &ClerkConfig{
		PublicKey:        publicKey,
		SecretKey:        secretKey,
		SigningKey:       signingKey,
		SigningAlgorithm: signingAlgorithm,
	}, nil
}

// loadStorageConfig loads storage-related configuration.
func loadStorageConfig() (*StorageConfig, error) {
	lakefsURL, err := getEnvString("LAKE_FS_URL", true, "")
	if err != nil {
		return nil, err
	}
	lakefsAccessKey, err := getEnvString("LAKE_FS_ACCESS_KEY_ID", true, "")
	if err != nil {
		return nil, err
	}
	lakefsSecretKey, err := getEnvString("LAKE_FS_SECRET_ACCESS_KEY", true, "")
	if err != nil {
		return nil, err
	}
	s3Endpoint, err := getEnvString("S3_ENDPOINT", true, "")
	if err != nil {
		return nil, err
	}
	s3Bucket, err := getEnvString("S3_BUCKET", false, "")
	if err != nil {
		return nil, err
	}
	s3Folder, err := getEnvString("S3_FOLDER", true, "")
	if err != nil {
		return nil, err
	}
	s3Region, err := getEnvString("S3_REGION", true, "")
	if err != nil {
		return nil, err
	}
	s3AccessKeyID, err := getEnvString("S3_ACCESS_KEY_ID", true, "")
	if err != nil {
		return nil, err
	}
	s3AccessSecret, err := getEnvString("S3_ACCESS_SECRET", true, "")
	if err != nil {
		return nil, err
	}
	return &StorageConfig{
		LakeFSURL:       lakefsURL,
		LakeFSAccessKey: lakefsAccessKey,
		LakeFSSecretKey: lakefsSecretKey,
		S3Endpoint:      s3Endpoint,
		S3Bucket:        s3Bucket,
		S3Folder:        s3Folder,
		S3Region:        s3Region,
		S3AccessKeyID:   s3AccessKeyID,
		S3AccessSecret:  s3AccessSecret,
	}, nil
}

// loadTestConfig loads test-related configuration.
func loadTestConfig() (*TestConfig, error) {
	connectorBaseURL, err := getEnvString("TEST_CONNECTOR_BASE_URL", false, "")
	if err != nil {
		return nil, err
	}
	connectorToken, err := getEnvString("TEST_CONNECTOR_TOKEN", false, "")
	if err != nil {
		return nil, err
	}
	connectorPath, err := getEnvString("TEST_CONNECTOR_PATH", false, "")
	if err != nil {
		return nil, err
	}
	objectName, err := getEnvString("TEST_OBJECT_NAME", false, "")
	if err != nil {
		return nil, err
	}
	workspace, err := getEnvString("TEST_WORKSPACE", false, "")
	if err != nil {
		return nil, err
	}
	repository, err := getEnvString("TEST_REPOSITORY", false, "")
	if err != nil {
		return nil, err
	}
	branch, err := getEnvString("TEST_BRANCH", false, "")
	if err != nil {
		return nil, err
	}
	tag, err := getEnvString("TEST_TAG", false, "")
	if err != nil {
		return nil, err
	}
	return &TestConfig{
		ConnectorBaseURL: connectorBaseURL,
		ConnectorToken:   connectorToken,
		ConnectorPath:    connectorPath,
		ObjectName:       objectName,
		Workspace:        workspace,
		Repository:       repository,
		Branch:           branch,
		Tag:              tag,
	}, nil
}

// LoadEnv loads environment variables from the .env file in the project root,
// sets default values for required system variables if not present, and returns
// a CoreAPIEnv struct with the loaded environment variables.
func LoadEnv() (*CoreAPIEnv, error) {
	if loadRootEnvErr := LoadRootEnv(); loadRootEnvErr != nil {
		return nil, loadRootEnvErr
	}

	serverConfig, err := loadServerConfig()
	if err != nil {
		return nil, err
	}

	featureConfig, err := loadFeatureConfig()
	if err != nil {
		return nil, err
	}

	coreConfig, err := loadCoreConfig()
	if err != nil {
		return nil, err
	}

	clerkConfig, err := loadClerkConfig()
	if err != nil {
		return nil, err
	}

	storageConfig, err := loadStorageConfig()
	if err != nil {
		return nil, err
	}

	testConfig, err := loadTestConfig()
	if err != nil {
		return nil, err
	}

	return &CoreAPIEnv{
		Port:                     serverConfig.Port,
		URL:                      serverConfig.URL,
		SystemToken:              serverConfig.SystemToken,
		CorsEnabled:              featureConfig.CorsEnabled,
		PreforkEnabled:           featureConfig.PreforkEnabled,
		HelmetEnabled:            featureConfig.HelmetEnabled,
		CorsOrigins:              featureConfig.CorsOrigins,
		OrchestratorEnabled:      featureConfig.OrchestratorEnabled,
		SqidAlphabet:             coreConfig.SqidAlphabet,
		DatabaseConnectionString: coreConfig.DatabaseConnectionString,
		ResendAPIKey:             coreConfig.ResendAPIKey,
		ConsoleURL:               coreConfig.ConsoleURL,
		InviteExpiresInDays:      coreConfig.InviteExpiresInDays,
		ClerkPublicKey:           clerkConfig.PublicKey,
		ClerkSecretKey:           clerkConfig.SecretKey,
		ClerkSigningKey:          clerkConfig.SigningKey,
		ClerkSigningAlgorithm:    clerkConfig.SigningAlgorithm,
		LakeFSURL:                storageConfig.LakeFSURL,
		LakeFSAccessKey:          storageConfig.LakeFSAccessKey,
		LakeFSSecretKey:          storageConfig.LakeFSSecretKey,
		S3Endpoint:               storageConfig.S3Endpoint,
		S3Bucket:                 storageConfig.S3Bucket,
		S3Folder:                 storageConfig.S3Folder,
		S3Region:                 storageConfig.S3Region,
		S3AccessKeyID:            storageConfig.S3AccessKeyID,
		S3AccessSecret:           storageConfig.S3AccessSecret,
		TestConnectorBaseURL:     testConfig.ConnectorBaseURL,
		TestConnectorToken:       testConfig.ConnectorToken,
		TestConnectorPath:        testConfig.ConnectorPath,
		TestObjectName:           testConfig.ObjectName,
		TestWorkspace:            testConfig.Workspace,
		TestRepository:           testConfig.Repository,
		TestBranch:               testConfig.Branch,
		TestTag:                  testConfig.Tag,
	}, nil
}
