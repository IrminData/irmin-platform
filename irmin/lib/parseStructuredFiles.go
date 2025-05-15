package lib

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"strings"
)

// ParseStructuredFile parses structured files (e.g., JSON, CSV, Parquet) from the provided results map.
// It returns a map where the keys are file names and the values are slices of maps representing the parsed data.
// Each map in the slice corresponds to a row in the structured file, with keys representing column names and values representing cell values.
// TODO: We need to move this to use DuckDB, like the schema generator does.
func ParseStructuredFile(files map[string][]byte) (map[string][]map[string]any, error) {
	// Create a map to hold the parsed results.
	parsedResults := make(map[string][]map[string]any)

	// Loop through the results and parse each result file.
	for fileName, result := range files {
		// Handle JSON files.
		if strings.HasSuffix(fileName, ".json") {
			// Parse the JSON file.
			var jsonData []map[string]any
			if err := json.Unmarshal(result, &jsonData); err != nil {
				return nil, fmt.Errorf("failed to parse JSON file %s: %w", fileName, err)
			}
			// Store the parsed JSON data in the map.
			parsedResults[fileName] = jsonData
			continue
		}

		// Handle CSV files.
		if strings.HasSuffix(fileName, ".csv") {
			// Create a CSV reader reading from the byte slice.
			reader := csv.NewReader(bytes.NewReader(result))

			// Read all records from the CSV.
			records, err := reader.ReadAll()
			if err != nil {
				return nil, fmt.Errorf("failed to parse CSV file %s: %w", fileName, err)
			}

			// Skip empty CSV.
			if len(records) < 1 {
				parsedResults[fileName] = []map[string]any{}
				continue
			}

			// First row is the header.
			headers := records[0]

			// Parse each subsequent row into a map.
			var csvData []map[string]any
			for _, row := range records[1:] {
				rowMap := make(map[string]any)
				for i, header := range headers {
					if i < len(row) {
						rowMap[header] = row[i]
					} else {
						rowMap[header] = ""
					}
				}
				csvData = append(csvData, rowMap)
			}

			// Store the parsed CSV data in the map.
			parsedResults[fileName] = csvData
			continue
		}

		// TODO: Implement Parquet parsing.
	}

	return parsedResults, nil
}
