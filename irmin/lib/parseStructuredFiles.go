package lib

import (
	"encoding/json"
	"fmt"
	"strings"
)

// ParseStructuredFile parses structured files (e.g., JSON, CSV, Parquet) from the provided results map.
// It returns a map where the keys are file names and the values are slices of maps representing the parsed data.
// Each map in the slice corresponds to a row in the structured file, with keys representing column names and values representing cell values.
func ParseStructuredFile(files map[string][]byte) (map[string][]map[string]any, error) {
	// Create a map to hold the parsed results.
	parsedResults := make(map[string][]map[string]any)
	// Loop through the results and parse each result file.
	for fileName, result := range files {
		// Check if the result is a JSON file
		if strings.HasSuffix(fileName, ".json") {
			// Parse the JSON file
			var jsonData []map[string]any
			err := json.Unmarshal(result, &jsonData)
			if err != nil {
				return nil, fmt.Errorf("failed to parse JSON file %s: %v", fileName, err)
			}
			// Store the parsed JSON data in the map
			parsedResults[fileName] = jsonData
		}
		// TODO: Implement CSV parsing
		// TODO: Implement Parquet parsing
	}
	return parsedResults, nil
}
