package lib_test

import (
	"irmin-api/lib"
	"testing"

	"github.com/zeebo/assert"
)

// TestCoreSupportedFormats tests only the core file formats that should always be available
// without requiring any optional DuckDB extensions.
func TestCoreSupportedFormats(t *testing.T) {
	ts := lib.GetTestSuite()

	testCases := []struct {
		name     string
		fileName string
		content  []byte
	}{
		{
			name:     "JSON format",
			fileName: "test.json",
			content:  []byte(`{"id": 1, "name": "test", "active": true}`),
		},
		{
			name:     "JSONL format",
			fileName: "test.jsonl",
			content:  []byte(`{"id": 1, "name": "test1"}` + "\n" + `{"id": 2, "name": "test2"}`),
		},
		{
			name:     "CSV format",
			fileName: "test.csv",
			content:  []byte("id,name,active\n1,test1,\"true\"\n2,test2,\"false\""),
		},
		{
			name:     "TSV format",
			fileName: "test.tsv",
			content:  []byte("id\tname\tactive\n1\ttest1\t\"true\"\n2\ttest2\t\"false\""),
		},
		{
			name:     "XML as text format",
			fileName: "test.xml",
			content:  []byte(`<?xml version="1.0"?><root><item>test</item></root>`),
		},
		{
			name:     "YAML as text format",
			fileName: "test.yaml",
			content:  []byte(`name: test\nvalue: 123\nactive: true`),
		},
	}

	ctx := t.Context()

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			files := map[string][]byte{
				tc.fileName: tc.content,
			}

			results, err := lib.ParseStructuredFiles(ctx, files, ts.Env, ts.Logger)
			assert.NoError(t, err)
			assert.NotNil(t, results)

			fileData, exists := results[tc.fileName]
			assert.True(t, exists)
			assert.True(t, len(fileData) > 0)

			// Verify basic structure for known formats
			switch tc.fileName {
			case "test.json":
				assert.Equal(t, 1, len(fileData))
				assert.Equal(t, int64(1), fileData[0]["id"])
				assert.Equal(t, "test", fileData[0]["name"])
				assert.Equal(t, true, fileData[0]["active"])

			case "test.jsonl":
				assert.Equal(t, 2, len(fileData))
				assert.Equal(t, int64(1), fileData[0]["id"])
				assert.Equal(t, "test1", fileData[0]["name"])
				assert.Equal(t, int64(2), fileData[1]["id"])
				assert.Equal(t, "test2", fileData[1]["name"])

			case "test.csv", "test.tsv":
				assert.Equal(t, 2, len(fileData)) // 2 data rows (header excluded)
				assert.Equal(t, int64(1), fileData[0]["id"])
				assert.Equal(t, "test1", fileData[0]["name"])
				assert.Equal(t, true, fileData[0]["active"])
				assert.Equal(t, int64(2), fileData[1]["id"])
				assert.Equal(t, "test2", fileData[1]["name"])
				assert.Equal(t, false, fileData[1]["active"])
			}
		})
	}
}

// TestErrorHandlingCore tests error handling for core functionality.
func TestErrorHandlingCore(t *testing.T) {
	ts := lib.GetTestSuite()
	ctx := t.Context()

	testCases := []struct {
		name        string
		fileName    string
		content     []byte
		shouldError bool
	}{
		{
			name:        "Invalid JSON",
			fileName:    "bad.json",
			content:     []byte(`{"name": "test", "incomplete"`),
			shouldError: true,
		},
		{
			name:        "Unsupported extension",
			fileName:    "test.txt",
			content:     []byte(`some text content`),
			shouldError: true,
		},
		{
			name:        "Empty JSON file",
			fileName:    "empty.json",
			content:     []byte(``),
			shouldError: false,
		},
		{
			name:        "Empty CSV file",
			fileName:    "empty.csv",
			content:     []byte(``),
			shouldError: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			files := map[string][]byte{
				tc.fileName: tc.content,
			}

			results, err := lib.ParseStructuredFiles(ctx, files, ts.Env, ts.Logger)

			if tc.shouldError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, results)
			}
		})
	}
}
