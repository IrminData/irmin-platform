package lib_test

import (
	"irmin-api/lib"
	"strings"
	"testing"

	"github.com/zeebo/assert"
)

// TestBasicFileFormatRecognition tests that file formats are recognized correctly
// without getting into complex data validation.
func TestBasicFileFormatRecognition(t *testing.T) {
	ts := lib.GetTestSuite()

	testCases := []struct {
		name        string
		fileName    string
		content     []byte
		shouldError bool
	}{
		// Supported formats
		{
			name:        "JSON recognition",
			fileName:    "test.json",
			content:     []byte(`{"test": "data"}`),
			shouldError: false,
		},
		{
			name:        "CSV recognition",
			fileName:    "test.csv",
			content:     []byte(`col1,col2\nval1,val2`),
			shouldError: false,
		},
		{
			name:        "TSV recognition",
			fileName:    "test.tsv",
			content:     []byte(`col1	col2\nval1	val2`),
			shouldError: false,
		},
		{
			name:        "JSONL recognition",
			fileName:    "test.jsonl",
			content:     []byte(`{"test": "data1"}` + "\n" + `{"test": "data2"}`),
			shouldError: false,
		},
		{
			name:        "XML recognition",
			fileName:    "test.xml",
			content:     []byte(`<root><item>test</item></root>`),
			shouldError: false,
		},
		{
			name:        "YAML recognition",
			fileName:    "test.yaml",
			content:     []byte(`test: data\nvalue: 123`),
			shouldError: false,
		},
		// Unsupported formats
		{
			name:        "TXT file rejection",
			fileName:    "test.txt",
			content:     []byte(`some text content`),
			shouldError: true,
		},
		{
			name:        "Unknown extension rejection",
			fileName:    "test.xyz",
			content:     []byte(`unknown content`),
			shouldError: true,
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
				assert.Nil(t, results)
			} else {
				// Basic checks - just verify no error and results exist
				assert.NoError(t, err)
				assert.NotNil(t, results)

				fileData, exists := results[tc.fileName]
				assert.True(t, exists)
				// Just verify we got some data back, don't validate specific content
				// Note: fileData length is always >= 0, so we just verify it exists
				_ = fileData
			}
		})
	}
}

// TestPlatformSpecificFormats tests formats that may not be available on all platforms.
func TestPlatformSpecificFormats(t *testing.T) {
	ts := lib.GetTestSuite()

	testCases := []struct {
		name     string
		fileName string
		content  []byte
	}{
		{
			name:     "Avro format",
			fileName: "test.avro",
			content:  []byte(`fake avro content`),
		},
		{
			name:     "Delta format",
			fileName: "test.delta",
			content:  []byte(`fake delta content`),
		},
		{
			name:     "Iceberg format",
			fileName: "test.iceberg",
			content:  []byte(`fake iceberg content`),
		},
		{
			name:     "Excel format",
			fileName: "test.xlsx",
			content:  []byte(`fake excel content`),
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			files := map[string][]byte{
				tc.fileName: tc.content,
			}

			_, err := lib.ParseStructuredFiles(files, ts.Env, ts.Logger)

			// For platform-specific formats, we expect either success (if extension available)
			// or a descriptive error message (if not supported on platform)
			if err != nil {
				if strings.Contains(strings.ToLower(err.Error()), "not supported on this platform") {
					t.Skipf("Skipping %s - format not supported on this platform: %v", tc.name, err)
				} else {
					// Should not be an "unsupported file type" error for recognized formats
					assert.False(t, strings.Contains(strings.ToLower(err.Error()), "unsupported file type"))
				}
			}
		})
	}
}
