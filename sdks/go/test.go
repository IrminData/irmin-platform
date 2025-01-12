package main

import (
	"irmin-sdk/examples"
	"log"
	"os"

	"github.com/joho/godotenv"
)

func main() {
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

	// Create objects used by the examples
	workspaceSlug := examples.CreateTestWorkspace(baseURL, apiToken, locale)
	examples.CreateTestRepository(baseURL, apiToken, locale)
	examples.CreateTestScriptFile(baseURL, apiToken, locale)
	connectionID := examples.CreateTestConnection(baseURL, apiToken, locale)

	// Run examples
	examples.TestProfile(baseURL, apiToken, locale)
	examples.TestRoles(baseURL, apiToken, locale)
	examples.TestWorkspaces(*workspaceSlug, baseURL, apiToken, locale)
	examples.TestUsers(baseURL, apiToken, locale)
	examples.TestInvites(*workspaceSlug, baseURL, apiToken, locale)
	examples.TestCredentials(baseURL, apiToken, locale)
	examples.TestConnectors(baseURL, apiToken, locale)
	examples.TestConnections(*connectionID, baseURL, apiToken, locale)
	examples.TestWorkflows(*connectionID, baseURL, apiToken, locale)
	examples.TestRepositories(baseURL, apiToken, locale)
	examples.TestEditorItems(baseURL, apiToken, locale)
	examples.TestVersioningAndObjects(baseURL, apiToken, locale)
	examples.TestLogs(baseURL, apiToken, locale)

	// Clean up and delete the example objects
	examples.DeleteTestRepository(baseURL, apiToken, locale)
	examples.DeleteTestScriptFile(baseURL, apiToken, locale)
	examples.DeleteTestConnection(*connectionID, baseURL, apiToken, locale)
	examples.DeleteTestWorkspace(*workspaceSlug, baseURL, apiToken, locale)
}
