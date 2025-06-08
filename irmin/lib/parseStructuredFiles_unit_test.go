package lib_test

import (
	"irmin-api/lib"
	"testing"

	"strings"

	"github.com/zeebo/assert"
)

// TestGetFileExtension tests the file extension extraction logic.
func TestGetFileExtension(t *testing.T) {
	testCases := []struct {
		name        string
		fileName    string
		expectedExt string
	}{
		// Basic extensions
		{"JSON file", "test.json", ".json"},
		{"CSV file", "data.csv", ".csv"},
		{"TSV file", "table.tsv", ".tsv"},
		{"Parquet file", "data.parquet", ".parquet"},

		// Case insensitive
		{"Uppercase JSON", "DATA.JSON", ".json"},
		{"Mixed case CSV", "File.CSV", ".csv"},

		// Advanced formats
		{"Avro file", "data.avro", ".avro"},
		{"ORC file", "table.orc", ".orc"},
		{"Delta file", "lake.delta", ".delta"},
		{"Iceberg file", "warehouse.iceberg", ".iceberg"},

		// Office formats
		{"Excel XLSX", "sheet.xlsx", ".xlsx"},
		{"Excel XLS", "old.xls", ".xls"},

		// Text formats
		{"XML file", "config.xml", ".xml"},
		{"YAML file", "config.yaml", ".yaml"},
		{"YML file", "docker.yml", ".yml"},

		// Complex filenames
		{"Path with dirs", "data/2024/sales.csv", ".csv"},
		{"Multiple dots", "backup.2024.01.15.csv", ".csv"},
		{"No extension", "README", ""},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Use reflection or test the actual function if it's exported
			// For now, we'll test via the main function behavior
			files := map[string][]byte{
				tc.fileName: []byte(`test,data\n1,value`),
			}

			ts := lib.GetTestSuite()
			_, err := lib.ParseStructuredFiles(files, ts.Env, ts.Logger)

			// For supported extensions, we shouldn't get "unsupported file type" error
			if tc.expectedExt != "" {
				if err != nil {
					// The error should not be about unsupported file type for known extensions
					assert.False(t, err.Error() == "unsupported file type: "+tc.fileName)
				}
			}
		})
	}
}

// TestFileFormatHandling tests how different file formats are processed.
func TestFileFormatHandling(t *testing.T) {
	ts := lib.GetTestSuite()

	testCases := []struct {
		name        string
		fileName    string
		content     []byte
		shouldError bool
		description string
	}{
		{
			name:        "Valid JSON content",
			fileName:    "test.json",
			content:     []byte(`{"id": 1, "name": "test"}`),
			shouldError: false,
			description: "JSON format with valid content should parse successfully",
		},
		{
			name:     "Valid JSONL content",
			fileName: "test.jsonl",
			content: []byte(`{"id": 1, "name": "test1"}
{"id": 2, "name": "test2"}`),
			shouldError: false,
			description: "JSONL format should parse multiple JSON objects",
		},
		{
			name:        "Valid CSV content",
			fileName:    "test.csv",
			content:     []byte(`id,name\n1,test1\n2,test2`),
			shouldError: false,
			description: "CSV format should parse successfully",
		},
		{
			name:        "Valid TSV content",
			fileName:    "test.tsv",
			content:     []byte(`id	name\n1	test1\n2	test2`),
			shouldError: false,
			description: "TSV format should parse with tab delimiter",
		},
		{
			name:        "Empty JSON file",
			fileName:    "empty.json",
			content:     []byte(``),
			shouldError: false,
			description: "Empty files should be handled gracefully",
		},
		{
			name:        "Malformed JSON",
			fileName:    "bad.json",
			content:     []byte(`{"id": 1, "name": `),
			shouldError: true,
			description: "Malformed JSON should produce an error",
		},
		{
			name:        "XML as text",
			fileName:    "config.xml",
			content:     []byte(`<?xml version="1.0"?><root><item>test</item></root>`),
			shouldError: false,
			description: "XML should be treated as text format",
		},
		{
			name:        "YAML as text",
			fileName:    "config.yaml",
			content:     []byte(`name: test\nvalue: 123`),
			shouldError: false,
			description: "YAML should be treated as text format",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			files := map[string][]byte{
				tc.fileName: tc.content,
			}

			results, err := lib.ParseStructuredFiles(files, ts.Env, ts.Logger)

			if tc.shouldError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, results)
				_, exists := results[tc.fileName]
				assert.True(t, exists)
			}
		})
	}
}

// TestAdvancedFormatRecognition tests recognition of advanced file formats.
func TestAdvancedFormatRecognition(t *testing.T) {
	ts := lib.GetTestSuite()

	// These tests focus on format recognition rather than actual parsing
	// since we don't have real Avro/ORC/Delta/Iceberg content
	testCases := []struct {
		name             string
		fileName         string
		content          []byte
		platformSpecific bool // Whether this format requires platform-specific extensions
		expectSuccess    bool // Whether this format should succeed (e.g., Excel falls back to CSV)
	}{
		{"Avro extension", "data.avro", []byte(`fake avro content`), true, false},
		{"ORC extension", "table.orc", []byte(`fake orc content`), false, false},
		{"Delta extension", "lake.delta", []byte(`fake delta content`), true, false},
		{"Iceberg extension", "warehouse.iceberg", []byte(`fake iceberg content`), true, false},
		{"Excel XLSX", "sheet.xlsx", []byte(`fake excel content`), true, true},  // Falls back to CSV
		{"Excel XLS", "legacy.xls", []byte(`fake excel content`), true, true},   // Falls back to CSV
		{"Excel XLSM", "macro.xlsm", []byte(`fake excel content`), true, true},  // Falls back to CSV
		{"Excel XLSB", "binary.xlsb", []byte(`fake excel content`), true, true}, // Falls back to CSV
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			files := map[string][]byte{
				tc.fileName: tc.content,
			}

			_, err := lib.ParseStructuredFiles(files, ts.Env, ts.Logger)

			if tc.expectSuccess {
				// Excel formats fall back to CSV parsing, so they should succeed
				assert.NoError(t, err)
			} else {
				// We expect these to fail due to invalid content, but the error
				// should be about parsing, not about unsupported file type
				assert.Error(t, err)

				// For platform-specific formats, check if it's a platform support issue
				if tc.platformSpecific && strings.Contains(err.Error(), "not supported on this platform") {
					t.Skipf("Skipping %s - format not supported on this platform: %v", tc.name, err)
					return
				}

				// Otherwise, ensure it's not an "unsupported file type" error
				assert.False(t, err.Error() == "unsupported file type: "+tc.fileName)
			}
		})
	}
}

// TestErrorMessages tests that error messages are informative.
func TestErrorMessages(t *testing.T) {
	ts := lib.GetTestSuite()

	testCases := []struct {
		name            string
		fileName        string
		content         []byte
		expectedInError []string // Multiple possible error message fragments
	}{
		{
			name:            "Unsupported extension",
			fileName:        "test.txt",
			content:         []byte(`some text`),
			expectedInError: []string{"unsupported file type"},
		},
		{
			name:            "Invalid JSON",
			fileName:        "bad.json",
			content:         []byte(`{"invalid": json}`),
			expectedInError: []string{"json", "malformed", "invalid", "failed to create view"},
		},
		{
			name:            "Invalid Parquet",
			fileName:        "fake.parquet",
			content:         []byte(`not parquet data`),
			expectedInError: []string{"parquet", "failed to create view", "failed to parse"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			files := map[string][]byte{
				tc.fileName: tc.content,
			}

			_, err := lib.ParseStructuredFiles(files, ts.Env, ts.Logger)
			assert.Error(t, err)

			// Check that the error message contains at least one of the expected text fragments
			errorMsg := strings.ToLower(err.Error())
			found := false
			for _, expected := range tc.expectedInError {
				if strings.Contains(errorMsg, strings.ToLower(expected)) {
					found = true
					break
				}
			}
			assert.True(t, found)
		})
	}
}

// TestMultipleFileProcessing tests processing multiple files simultaneously.
func TestMultipleFileProcessing(t *testing.T) {
	ts := lib.GetTestSuite()

	files := map[string][]byte{
		"users.json": []byte(`{"id": 1, "name": "Alice"}
{"id": 2, "name": "Bob"}`),
		"products.csv": []byte(`id,name,price
1,Widget,10.99
2,Gadget,15.99`),
		"orders.tsv": []byte(`order_id	user_id	product_id
1	1	1
2	2	2`),
		"config.jsonl": []byte(`{"setting": "debug", "value": true}
{"setting": "timeout", "value": 30}`),
		"metadata.yaml": []byte(`version: 1.0
name: test`),
	}

	results, err := lib.ParseStructuredFiles(files, ts.Env, ts.Logger)
	assert.NoError(t, err)
	assert.NotNil(t, results)
	assert.Equal(t, len(files), len(results))

	// Verify each file was processed
	for fileName := range files {
		_, exists := results[fileName]
		assert.True(t, exists)
	}

	// Verify specific content for some files
	usersData := results["users.json"]
	assert.Equal(t, 2, len(usersData))
	assert.Equal(t, int64(1), usersData[0]["id"])
	assert.Equal(t, "Alice", usersData[0]["name"])

	productsData := results["products.csv"]
	assert.Equal(t, 2, len(productsData))
	assert.Equal(t, int64(1), productsData[0]["id"])
	assert.Equal(t, "Widget", productsData[0]["name"])
}

// TestEmptyAndMinimalFiles tests edge cases with empty or minimal files.
func TestEmptyAndMinimalFiles(t *testing.T) {
	ts := lib.GetTestSuite()

	testCases := []struct {
		name        string
		fileName    string
		content     []byte
		shouldError bool
	}{
		{
			name:        "Empty JSON",
			fileName:    "empty.json",
			content:     []byte(``),
			shouldError: false,
		},
		{
			name:        "Empty CSV",
			fileName:    "empty.csv",
			content:     []byte(``),
			shouldError: false,
		},
		{
			name:        "CSV header only",
			fileName:    "header_only.csv",
			content:     []byte(`id,name`),
			shouldError: false,
		},
		{
			name:        "Single JSON object",
			fileName:    "single.json",
			content:     []byte(`{"id": 1}`),
			shouldError: false,
		},
		{
			name:        "Whitespace only",
			fileName:    "whitespace.csv",
			content:     []byte(`   \n  \t  \n`),
			shouldError: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			files := map[string][]byte{
				tc.fileName: tc.content,
			}

			results, err := lib.ParseStructuredFiles(files, ts.Env, ts.Logger)

			if tc.shouldError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, results)
				_, exists := results[tc.fileName]
				assert.True(t, exists)
			}
		})
	}
}
