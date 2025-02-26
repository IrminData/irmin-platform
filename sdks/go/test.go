package main

import (
	"flag"
	"log"
	"os"

	irminSDKTests "github.com/IrminData/irmin-sdk-go/tests"

	"github.com/joho/godotenv"
)

func main() {
	// Define flags
	runAPI := flag.Bool("api", false, "Run API tests")
	runUtils := flag.Bool("utils", false, "Run utility tests")
	flag.Parse()

	// Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	// Read values from environment variables
	baseURL := os.Getenv("BASE_URL")
	apiToken := os.Getenv("API_TOKEN")
	locale := os.Getenv("LOCALE")

	if baseURL == "" || apiToken == "" || locale == "" {
		log.Fatalf("Missing required environment variables: BASE_URL, API_TOKEN, or LOCALE")
	}

	// Utility tests
	if *runUtils {
		log.Println("Running utility tests...")
		irminSDKTests.TestParquetUtils()
		irminSDKTests.TestSchemaUtils()
	}

	// API tests
	if *runAPI {
		log.Println("Running API tests...")

		// Create objects used by the examples
		workspaceSlug := irminSDKTests.CreateTestWorkspace(baseURL, apiToken, locale)
		irminSDKTests.CreateTestRepository(baseURL, apiToken, locale)
		irminSDKTests.CreateTestScriptFile(baseURL, apiToken, locale)
		connectionID := irminSDKTests.CreateTestConnection(baseURL, apiToken, locale)

		// Run examples
		irminSDKTests.TestProfile(baseURL, apiToken, locale)
		irminSDKTests.TestRoles(baseURL, apiToken, locale)
		irminSDKTests.TestWorkspaces(*workspaceSlug, baseURL, apiToken, locale)
		irminSDKTests.TestUsers(baseURL, apiToken, locale)
		irminSDKTests.TestInvites(*workspaceSlug, baseURL, apiToken, locale)
		irminSDKTests.TestCredentials(baseURL, apiToken, locale)
		irminSDKTests.TestConnectors(baseURL, apiToken, locale)
		irminSDKTests.TestConnections(*connectionID, baseURL, apiToken, locale)
		irminSDKTests.TestWorkflows(*connectionID, baseURL, apiToken, locale)
		irminSDKTests.TestRepositories(baseURL, apiToken, locale)
		irminSDKTests.TestEditorItems(baseURL, apiToken, locale)
		irminSDKTests.TestVersioningAndObjects(baseURL, apiToken, locale)
		irminSDKTests.TestLogs(baseURL, apiToken, locale)

		// Clean up and delete the example objects
		irminSDKTests.DeleteTestRepository(baseURL, apiToken, locale)
		irminSDKTests.DeleteTestScriptFile(baseURL, apiToken, locale)
		irminSDKTests.DeleteTestConnection(*connectionID, baseURL, apiToken, locale)
		irminSDKTests.DeleteTestWorkspace(*workspaceSlug, baseURL, apiToken, locale)
	}

	// Check if no tests were selected
	if !*runAPI && !*runUtils {
		log.Println("No tests selected. Use -api, -utils, or both to run tests.")
	}
}
