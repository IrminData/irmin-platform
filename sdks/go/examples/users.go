package examples

import (
	"fmt"
	"irmin-sdk/client"
	"irmin-sdk/services"
	"log"
	"os"

	"github.com/joho/godotenv"
)

func TestUsers() {
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

	// Initialise the client and service
	apiClient := client.NewClient(baseURL, apiToken, locale)
	profileService := services.NewProfileService(apiClient)
	userService := services.NewUserService(apiClient)

	// Fetch the current user
	profile, err := profileService.GetProfile()
	if err != nil {
		fmt.Println("Error fetching profile:", err)
		return
	}
	fmt.Printf("Current User: %s (%s)\n", profile.FirstName, profile.Email)

	// Fetch users in the current workspace
	users, err := userService.FetchWorkspaceUsers()
	if err != nil {
		fmt.Println("Error fetching users:", err)
		return
	}
	for _, user := range users {
		fmt.Printf("User: %s (%s)\n", user.FirstName, user.Email)
	}
}
