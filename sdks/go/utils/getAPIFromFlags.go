package irminUtils

import (
	"flag"
	"fmt"
)

// GetAPIFromFlags retrieves the API key and the base URL from command line flags.
func GetAPIFromFlags() (string, string, error) {
	// Check if the API key is provided as a flag
	apiKey := flag.String("api-key", "", "API key for authentication")
	apiURL := flag.String("api-url", "https://api.irmin.co/api", "API URL for the Irmin API")
	flag.Parse()

	// Validate the API key
	if *apiKey == "" {
		return *apiURL, *apiKey, fmt.Errorf("API key is required")
	}
	// Validate the API URL
	if *apiURL == "" {
		return *apiURL, *apiKey, fmt.Errorf("API URL is required")
	}

	return *apiURL, *apiKey, nil
}
