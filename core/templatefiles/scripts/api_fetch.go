//go:build ignore

// Title: External API Fetcher
// Description: Fetches data from an external REST API and saves it as a file in the workspace.
// Tags: api, fetch, external-data
// Placeholders: api_url:https://api.example.com/data

package main

import (
	"io"
	"log"
	"net/http"
	"time"

	irminutils "github.com/IrminData/irmin-platform/sdks/go/utils"
)

func main() {
	apiURL := "{{api_url}}"

	// Create an HTTP client with timeout
	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	// 1. Fetch data from API
	log.Printf("Fetching data from %s...", apiURL)
	resp, err := client.Get(apiURL)
	if err != nil {
		log.Fatalf("Error fetching from API: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Fatalf("API returned non-200 status: %d", resp.StatusCode)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Fatalf("Error reading response body: %v", err)
	}

	// 2. Save the raw data as a result file
	// The system will store this in the compute sandbox output
	if err := irminutils.SendComputeResult(data, "api_export.json"); err != nil {
		log.Fatalf("Error saving result: %v", err)
	}

	log.Printf("Successfully fetched %d bytes", len(data))
}
