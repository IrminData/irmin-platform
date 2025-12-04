package duckdb_test

import (
	"irmin-api/duckdb"
	"irmin-api/lib"
	"slices"
	"strings"
	"testing"

	"github.com/zeebo/assert"
)

// TestGetDuckDBReadOptionsByExtension tests extension-based format detection.
func TestGetDuckDBReadOptionsByExtension(t *testing.T) {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	testCases := []struct {
		name           string
		extension      string
		expectError    bool
		expectedFormat string
		expectedFunc   string
	}{
		{
			name:           "CSV extension",
			extension:      "csv",
			expectError:    false,
			expectedFormat: "CSV",
			expectedFunc:   "read_csv_auto",
		},
		{
			name:           "CSV with dot",
			extension:      ".csv",
			expectError:    false,
			expectedFormat: "CSV",
			expectedFunc:   "read_csv_auto",
		},
		{
			name:           "JSON extension",
			extension:      "json",
			expectError:    false,
			expectedFormat: "JSON",
			expectedFunc:   "read_json_auto",
		},
		{
			name:           "JSONL extension",
			extension:      "jsonl",
			expectError:    false,
			expectedFormat: "JSON",
			expectedFunc:   "read_json_auto",
		},
		{
			name:           "TSV extension",
			extension:      "tsv",
			expectError:    false,
			expectedFormat: "CSV",
			expectedFunc:   "read_csv_auto",
		},
		{
			name:           "Parquet extension",
			extension:      "parquet",
			expectError:    false,
			expectedFormat: "PARQUET",
			expectedFunc:   "read_parquet",
		},
		{
			name:           "Excel XLSX",
			extension:      "xlsx",
			expectError:    false,
			expectedFormat: "PARQUET",
			expectedFunc:   "st_read",
		},
		{
			name:           "Avro extension",
			extension:      "avro",
			expectError:    false,
			expectedFormat: "PARQUET",
			expectedFunc:   "read_avro",
		},
		{
			name:        "unsupported extension",
			extension:   "unknown",
			expectError: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := duckdb.GetDuckDBReadOptionsByExtension(tc.extension)

			if tc.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, tc.expectedFunc, result.ReadFunction)
				assert.True(t, strings.Contains(result.FormatOption, tc.expectedFormat))
			}
		})
	}
}

// TestGetDuckDBReadOptionsByMIMEType tests MIME type-based format detection.
func TestGetDuckDBReadOptionsByMIMEType(t *testing.T) {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	testCases := []struct {
		name           string
		mimeType       string
		expectError    bool
		expectedFormat string
		expectedFunc   string
	}{
		{
			name:           "CSV MIME type",
			mimeType:       "text/csv",
			expectError:    false,
			expectedFormat: "CSV",
			expectedFunc:   "read_csv_auto",
		},
		{
			name:           "JSON MIME type",
			mimeType:       "application/json",
			expectError:    false,
			expectedFormat: "JSON",
			expectedFunc:   "read_json_auto",
		},
		{
			name:           "JSONL MIME type",
			mimeType:       "application/jsonl",
			expectError:    false,
			expectedFormat: "JSON",
			expectedFunc:   "read_json_auto",
		},
		{
			name:           "TSV MIME type",
			mimeType:       "text/tab-separated-values",
			expectError:    false,
			expectedFormat: "CSV",
			expectedFunc:   "read_csv_auto",
		},
		{
			name:           "Parquet MIME type",
			mimeType:       "application/vnd.apache.parquet",
			expectError:    false,
			expectedFormat: "PARQUET",
			expectedFunc:   "read_parquet",
		},
		{
			name:           "Excel MIME type",
			mimeType:       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			expectError:    false,
			expectedFormat: "PARQUET",
			expectedFunc:   "st_read",
		},
		{
			name:           "Avro MIME type",
			mimeType:       "application/vnd.apache.avro",
			expectError:    false,
			expectedFormat: "PARQUET",
			expectedFunc:   "read_avro",
		},
		{
			name:        "unsupported MIME type",
			mimeType:    "application/unknown",
			expectError: true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := duckdb.GetDuckDBReadOptionsByMIMEType(tc.mimeType)

			if tc.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, tc.expectedFunc, result.ReadFunction)
				assert.True(t, strings.Contains(result.FormatOption, tc.expectedFormat))
			}
		})
	}
}

// TestGetDuckDBReadOptionsAutoDetection tests automatic format detection.
func TestGetDuckDBReadOptionsAutoDetection(t *testing.T) {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	testCases := []struct {
		name        string
		input       string
		expectError bool
		description string
	}{
		{
			name:        "file path with extension",
			input:       "data/file.csv",
			expectError: false,
			description: "should detect CSV from file extension",
		},
		{
			name:        "MIME type input",
			input:       "application/json",
			expectError: false,
			description: "should detect JSON from MIME type",
		},
		{
			name:        "file without extension",
			input:       "data/file",
			expectError: true,
			description: "should fail for file without extension",
		},
		{
			name:        "unknown MIME type",
			input:       "application/unknown",
			expectError: true,
			description: "should fail for unknown MIME type",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := duckdb.GetDuckDBReadOptions(tc.input)

			if tc.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.True(t, len(result.ReadFunction) > 0)
				assert.True(t, len(result.FormatOption) > 0)
			}
		})
	}
}

// TestBuildReadQuery tests DuckDB read query construction.
func TestBuildReadQuery(t *testing.T) {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	testCases := []struct {
		name         string
		filePath     string
		options      *duckdb.ReadOptions
		expectedFunc string
		hasParams    bool
	}{
		{
			name:     "CSV without parameters",
			filePath: "/path/to/data.csv",
			options: &duckdb.ReadOptions{
				ReadFunction: "read_csv_auto",
				FormatOption: "CSV",
				Parameters:   map[string]string{},
			},
			expectedFunc: "read_csv_auto",
			hasParams:    false,
		},
		{
			name:     "TSV with delimiter parameter",
			filePath: "/path/to/data.tsv",
			options: &duckdb.ReadOptions{
				ReadFunction: "read_csv_auto",
				FormatOption: "CSV",
				Parameters:   map[string]string{"delim": "\\t"},
			},
			expectedFunc: "read_csv_auto",
			hasParams:    true,
		},
		{
			name:     "JSON with format parameter",
			filePath: "/path/to/data.jsonl",
			options: &duckdb.ReadOptions{
				ReadFunction: "read_json_auto",
				FormatOption: "JSON",
				Parameters:   map[string]string{"format": "newline_delimited"},
			},
			expectedFunc: "read_json_auto",
			hasParams:    true,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := duckdb.BuildReadQuery(tc.filePath, tc.options)

			assert.True(t, strings.Contains(result, tc.expectedFunc))
			assert.True(t, strings.Contains(result, tc.filePath))

			if tc.hasParams {
				// Should contain parameter syntax
				assert.True(t, strings.Contains(result, ","))
			}
		})
	}
}

// TestGetRequiredExtensions tests DuckDB extension requirements.
func TestGetRequiredExtensions(t *testing.T) {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	testCases := []struct {
		name               string
		options            *duckdb.ReadOptions
		expectedExtensions []string
	}{
		{
			name: "CSV options",
			options: &duckdb.ReadOptions{
				ReadFunction: "read_csv_auto",
				Extension:    "",
			},
			expectedExtensions: []string{"httpfs"},
		},
		{
			name: "Avro options",
			options: &duckdb.ReadOptions{
				ReadFunction: "read_avro",
				Extension:    "avro",
			},
			expectedExtensions: []string{"httpfs", "avro"},
		},
		{
			name: "Spatial options",
			options: &duckdb.ReadOptions{
				ReadFunction: "st_read",
				Extension:    "spatial",
			},
			expectedExtensions: []string{"httpfs", "spatial"},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := duckdb.GetRequiredExtensions(tc.options)

			for _, expected := range tc.expectedExtensions {
				assert.True(t, slices.Contains(result, expected))
			}
		})
	}
}

// TestIsFormatSupported tests format support detection.
func TestIsFormatSupported(t *testing.T) {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	testCases := []struct {
		name      string
		input     string
		supported bool
	}{
		{
			name:      "CSV file",
			input:     "data.csv",
			supported: true,
		},
		{
			name:      "JSON file",
			input:     "data.json",
			supported: true,
		},
		{
			name:      "Parquet file",
			input:     "data.parquet",
			supported: true,
		},
		{
			name:      "Excel file",
			input:     "data.xlsx",
			supported: true,
		},
		{
			name:      "unsupported file",
			input:     "data.unknown",
			supported: false,
		},
		{
			name:      "CSV MIME type",
			input:     "text/csv",
			supported: true,
		},
		{
			name:      "unknown MIME type",
			input:     "application/unknown",
			supported: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := duckdb.IsFormatSupported(tc.input)
			assert.Equal(t, tc.supported, result)
		})
	}
}

// TestGetSupportedFormats tests getting list of supported formats.
func TestGetSupportedFormats(t *testing.T) {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	formats := duckdb.GetSupportedFormats()

	assert.True(t, len(formats) > 0)
	assert.True(t, slices.Contains(formats, "csv"))
	assert.True(t, slices.Contains(formats, "json"))
	assert.True(t, slices.Contains(formats, "parquet"))
	assert.True(t, slices.Contains(formats, "xlsx"))
}

// TestSpecialFormatHandling tests handling of special format cases.
func TestSpecialFormatHandling(t *testing.T) {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	testCases := []struct {
		name        string
		extension   string
		expectError bool
		description string
	}{
		{
			name:        "NDJSON format",
			extension:   "ndjson",
			expectError: false,
			description: "should handle newline-delimited JSON",
		},
		{
			name:        "TAB format",
			extension:   "tab",
			expectError: false,
			description: "should handle tab-separated values",
		},
		{
			name:        "XLSM format",
			extension:   "xlsm",
			expectError: false,
			description: "should handle Excel with macros",
		},
		{
			name:        "XLSB format",
			extension:   "xlsb",
			expectError: false,
			description: "should handle Excel binary format",
		},
		{
			name:        "YML format",
			extension:   "yml",
			expectError: false,
			description: "should handle YAML short extension",
		},
		{
			name:        "ORC format",
			extension:   "orc",
			expectError: false,
			description: "should handle Optimized Row Columnar format",
		},
		{
			name:        "Delta format",
			extension:   "delta",
			expectError: false,
			description: "should handle Delta Lake format",
		},
		{
			name:        "Iceberg format",
			extension:   "iceberg",
			expectError: false,
			description: "should handle Apache Iceberg format",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := duckdb.GetDuckDBReadOptionsByExtension(tc.extension)

			if tc.expectError {
				assert.Error(t, err)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.True(t, len(result.ReadFunction) > 0)
				assert.True(t, len(result.FormatOption) > 0)
				assert.True(t, len(result.Description) > 0)
			}
		})
	}
}

// TestPerformanceWithManyFormats tests performance when checking many formats.
func TestPerformanceWithManyFormats(t *testing.T) {
	testSuite := lib.GetTestSuite()
	if testSuite == nil {
		t.Skip("Test suite not initialized")
	}

	// Test a variety of formats to ensure performance is reasonable
	formats := []string{
		"csv", "json", "jsonl", "ndjson", "tsv", "tab",
		"parquet", "avro", "orc", "delta", "iceberg",
		"xlsx", "xls", "xlsm", "xlsb",
		"xml", "yaml", "yml",
	}

	for _, format := range formats {
		t.Run("format_"+format, func(t *testing.T) {
			// Should be fast enough to not timeout
			result, err := duckdb.GetDuckDBReadOptionsByExtension(format)
			assert.NoError(t, err)
			assert.NotNil(t, result)
		})
	}

	// Test MIME types as well
	mimeTypes := []string{
		"text/csv",
		"application/json",
		"application/jsonl",
		"text/tab-separated-values",
		"application/vnd.apache.parquet",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"application/vnd.apache.avro",
	}

	for _, mimeType := range mimeTypes {
		t.Run("mime_"+strings.ReplaceAll(mimeType, "/", "_"), func(t *testing.T) {
			result, err := duckdb.GetDuckDBReadOptionsByMIMEType(mimeType)
			assert.NoError(t, err)
			assert.NotNil(t, result)
		})
	}
}

// TestEscapeSQLString tests that EscapeSQLString properly escapes single quotes to prevent SQL injection.
func TestEscapeSQLString(t *testing.T) {
	testCases := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "no quotes",
			input:    "s3://bucket/path/file.json",
			expected: "s3://bucket/path/file.json",
		},
		{
			name:     "single quote in middle",
			input:    "s3://bucket/path/file'name.json",
			expected: "s3://bucket/path/file''name.json",
		},
		{
			name:     "single quote at start",
			input:    "'s3://bucket/path/file.json",
			expected: "''s3://bucket/path/file.json",
		},
		{
			name:     "single quote at end",
			input:    "s3://bucket/path/file.json'",
			expected: "s3://bucket/path/file.json''",
		},
		{
			name:     "multiple single quotes",
			input:    "s3://bucket/path/file'name'with'quotes.json",
			expected: "s3://bucket/path/file''name''with''quotes.json",
		},
		{
			name:     "SQL injection attempt",
			input:    "s3://bucket/path/file'; DROP TABLE users--",
			expected: "s3://bucket/path/file''; DROP TABLE users--",
		},
		{
			name:     "empty string",
			input:    "",
			expected: "",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := duckdb.EscapeSQLString(tc.input)
			assert.Equal(t, tc.expected, result)
		})
	}
}
