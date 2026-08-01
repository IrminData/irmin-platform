//go:build ignore

// Title: JSON Data Transformer
// Description: Reads a JSON input file, filters records based on criteria, and outputs the result.
// Tags: etl, json, transform
// Placeholders: input_file:data.json

package main

import (
	"encoding/json"
	"log"
	"strings"

	irminutils "github.com/IrminData/irmin-platform/sdks/go/utils"
)

// Record represents the structure of your data.
// Modify this struct to match your JSON data fields.
type Record struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

func main() {
	// 1. Get the content of the specific input file.
	// In a real run, this filename would be passed or discovered.
	// For templates, we use a placeholder or assume a standard name.
	filename := "{{input_file}}"

	// Check if file exists in input
	content, err := irminutils.GetInputFile(filename)
	if err != nil {
		// Fallback: try listing all files if specific one fails (e.g. during testing)
		files, _ := irminutils.ListInputFiles()
		if len(files) > 0 {
			filename = files[0]
			content, err = irminutils.GetInputFile(filename)
		}
	}

	if err != nil {
		log.Fatalf("Error reading input file: %v", err)
	}

	// 2. Parse the JSON data
	var records []Record
	if err := json.Unmarshal(content, &records); err != nil {
		log.Fatalf("Error parsing JSON: %v", err)
	}

	// 3. Transform/Filter data
	// Example: Keep only users with 'admin' role (case-insensitive)
	var admins []Record
	for _, r := range records {
		if strings.Contains(strings.ToLower(r.Role), "admin") {
			// Mask email for privacy in output
			r.Email = "***"
			admins = append(admins, r)
		}
	}

	// 4. Output the result
	outputBytes, err := json.MarshalIndent(admins, "", "  ")
	if err != nil {
		log.Fatalf("Error marshaling output: %v", err)
	}

	if err := irminutils.SendComputeResult(outputBytes, "admins_filtered.json"); err != nil {
		log.Fatalf("Error sending result: %v", err)
	}

	log.Printf("Successfully processed %d records, found %d admins", len(records), len(admins))
}
