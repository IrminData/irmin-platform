package irminUtils

import (
	"flag"
	"fmt"
)

// GetAPIKeyFromFlags retrieves the API key from command line flags.
func GetAPIKeyFromFlags() (string, error) {
	// Check if the API key is provided as a flag
	apiKey := flag.String("api-key", "", "API key for authentication")
	flag.Parse()

	// Validate the API key
	if *apiKey == "" {
		return "", fmt.Errorf("API key is required")
	}

	return *apiKey, nil
}
