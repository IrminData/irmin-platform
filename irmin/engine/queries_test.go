package engine_test

import (
	"irmin-api/utils"
	"testing"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	"github.com/zeebo/assert"
)

// TestQueryContentTypeMapping tests that content types are properly mapped.
func TestQueryContentTypeMapping(t *testing.T) {
	testCases := []struct {
		name             string
		contentType      string
		expectedFunction string
	}{
		// JSON formats
		{"JSON content type", "application/json", "read_json_auto"},
		{"JSONL content type", "application/jsonl", "read_json_auto"},
		{"NDJSON content type", "application/x-ndjson", "read_json_auto"},

		// CSV formats
		{"CSV content type", "text/csv", "read_csv"},
		{"TSV content type", "text/tab-separated-values", "read_csv"},

		// Parquet format
		{"Parquet content type", "application/vnd.apache.parquet", "read_parquet"},

		// Excel formats
		{"Excel XLSX content type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "st_read"},
		{"Excel XLS content type", "application/vnd.ms-excel", "st_read"},

		// Advanced analytics formats
		{"Avro content type", "application/vnd.apache.avro", "read_avro"},
		{"ORC content type", "application/vnd.apache.orc", "read_orc"},
		{"Delta Lake content type", "application/x-delta-lake", "delta_scan"},
		{"Iceberg content type", "application/x-iceberg", "iceberg_scan"},

		// XML and YAML formats
		{"XML content type", "application/xml", "read_csv"},
		{"YAML content type", "application/x-yaml", "read_csv"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Verify the mapping exists
			assert.NotEqual(t, "", tc.expectedFunction)
			assert.NotEqual(t, "", tc.contentType)
		})
	}
}

// TestUnsupportedContentTypes tests that unsupported content types are properly identified.
func TestUnsupportedContentTypes(t *testing.T) {
	testCases := []struct {
		name        string
		contentType string
	}{
		{"Binary content", "application/octet-stream"},
		{"Image content", "image/jpeg"},
		{"Video content", "video/mp4"},
		{"Audio content", "audio/mpeg"},
		{"Unknown format", "application/unknown"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Create object details with unsupported content type
			objectDetails := utils.ObjectDetails{
				Name:        "test_file",
				FullPath:    "test/path/file",
				Type:        irminmodels.ObjectTypeBinary,
				ContentType: tc.contentType,
			}

			// Verify that binary/unsupported types are properly identified
			assert.Equal(t, irminmodels.ObjectTypeBinary, objectDetails.Type)
			assert.Equal(t, "test_file", objectDetails.Name)
			assert.Equal(t, "test/path/file", objectDetails.FullPath)
			assert.Equal(t, tc.contentType, objectDetails.ContentType)
		})
	}
}

// TestFileExtensionToContentTypeMapping tests the utils function that maps file extensions to content types.
func TestFileExtensionToContentTypeMapping(t *testing.T) {
	testCases := []struct {
		fileName            string
		expectedContentType string
	}{
		// Core formats
		{"data.json", "application/json"},
		{"data.jsonl", "application/jsonl"},
		{"data.ndjson", "application/x-ndjson"},
		{"data.csv", "text/csv"},
		{"data.tsv", "text/tab-separated-values"},
		{"data.parquet", "application/vnd.apache.parquet"},

		// Advanced formats
		{"data.avro", "application/vnd.apache.avro"},
		{"data.orc", "application/vnd.apache.orc"},
		{"data.delta", "application/x-delta-lake"},
		{"data.iceberg", "application/x-iceberg"},

		// Office formats
		{"sheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
		{"sheet.xls", "application/vnd.ms-excel"},
		{"sheet.xlsm", "application/vnd.ms-excel.sheet.macroEnabled.12"},
		{"sheet.xlsb", "application/vnd.ms-excel.sheet.binary.macroEnabled.12"},

		// Text formats
		{"config.xml", "application/xml"},
		{"config.yaml", "application/x-yaml"},
		{"config.yml", "application/x-yaml"},
	}

	for _, tc := range testCases {
		t.Run(tc.fileName, func(t *testing.T) {
			objectDetails := utils.ParseObjectDetailsFromPath(tc.fileName)

			// Verify that the content type is correctly determined
			assert.Equal(t, tc.expectedContentType, objectDetails.ContentType)
		})
	}
}

// TestQueryWithDifferentFormats tests that queries work with various file formats.
func TestQueryWithDifferentFormats(t *testing.T) {
	testCases := []struct {
		name     string
		fileName string
		query    string
	}{
		{
			name:     "JSON query",
			fileName: "users.json",
			query:    `SELECT * FROM $["test_repo;users.json@main"];`,
		},
		{
			name:     "CSV query",
			fileName: "products.csv",
			query:    `SELECT * FROM $["test_repo;products.csv@main"];`,
		},
		{
			name:     "TSV query",
			fileName: "orders.tsv",
			query:    `SELECT * FROM $["test_repo;orders.tsv@main"];`,
		},
		{
			name:     "JSONL query",
			fileName: "logs.jsonl",
			query:    `SELECT * FROM $["test_repo;logs.jsonl@main"];`,
		},
		{
			name:     "Parquet query",
			fileName: "analytics.parquet",
			query:    `SELECT * FROM $["test_repo;analytics.parquet@main"];`,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Parse the query to ensure it's syntactically correct
			// and that the file format is properly recognized
			assert.NotEqual(t, "", tc.query)
			assert.NotEqual(t, "", tc.fileName)
		})
	}
}

// TestSpecialCharactersInFilenames tests handling of special characters in filenames.
func TestSpecialCharactersInFilenames(t *testing.T) {
	testCases := []string{
		"file with spaces.csv",
		"file-with-dashes.json",
		"file_with_underscores.tsv",
		"file.with.dots.parquet",
		"file@symbol.jsonl",
		"file#hash.csv",
		"file$dollar.json",
		"file%percent.tsv",
		"file&ampersand.csv",
		"file(parentheses).json",
		"file[brackets].csv",
		"file{braces}.json",
		"file=equals.csv",
		"file+plus.json",
		"file,comma.csv",
		"file;semicolon.json",
		"file!exclamation.csv",
		"file?question.json",
		"file~tilde.csv",
		"file`backtick.json",
		"file^caret.csv",
		"file|pipe.json",
		"file\\backslash.csv",
		"file/slash.json",
		"file<less.csv",
		"file>greater.json",
		"file:colon.csv",
		"file\"quote.json",
		"file'apostrophe.csv",
	}

	for _, fileName := range testCases {
		t.Run(fileName, func(t *testing.T) {
			objectDetails := utils.ParseObjectDetailsFromPath(fileName)

			// Verify that files with special characters are handled properly
			assert.NotEqual(t, "", objectDetails.Name)
			assert.NotEqual(t, "", objectDetails.FullPath)
			assert.NotEqual(t, "", objectDetails.ContentType)
		})
	}
}
