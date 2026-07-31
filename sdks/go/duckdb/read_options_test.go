package duckdb_test

import (
	"testing"

	"github.com/IrminData/irmin-platform/sdks/go/duckdb"
	"github.com/zeebo/assert"
)

func TestGetDuckDBReadOptions_MIMETypesWithDots(t *testing.T) {
	tests := []struct {
		name        string
		input       string
		shouldError bool
		description string
	}{
		{
			name:        "Excel XLSX MIME type with dots",
			input:       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			shouldError: false,
			description: "Excel spreadsheet format",
		},
		{
			name:        "Excel XLS MIME type",
			input:       "application/vnd.ms-excel",
			shouldError: false,
			description: "Excel spreadsheet format",
		},
		{
			name:        "Excel XLSM MIME type with dots",
			input:       "application/vnd.ms-excel.sheet.macroEnabled.12",
			shouldError: false,
			description: "Excel spreadsheet format",
		},
		{
			name:        "Excel XLSB MIME type with dots",
			input:       "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
			shouldError: false,
			description: "Excel spreadsheet format",
		},
		{
			name:        "Simple file extension",
			input:       "test.xlsx",
			shouldError: false,
			description: "Excel Open XML format",
		},
		{
			name:        "Extension only",
			input:       ".xlsx",
			shouldError: false,
			description: "Excel Open XML format",
		},
		{
			name:        "Unsupported extension",
			input:       "test.unknown",
			shouldError: true,
		},
		{
			name:        "Unsupported MIME type",
			input:       "application/x-unknown",
			shouldError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			opts, err := duckdb.GetDuckDBReadOptions(tt.input)

			if tt.shouldError {
				assert.NotNil(t, err)
			} else {
				assert.Nil(t, err)
				assert.NotNil(t, opts)
				if tt.description != "" {
					assert.Equal(t, tt.description, opts.Description)
				}
			}
		})
	}
}

func TestGetDuckDBReadOptions_FilePathVsMIMEType(t *testing.T) {
	tests := []struct {
		name             string
		input            string
		expectedFunction string
	}{
		{
			name:             "JSON file path",
			input:            "data.json",
			expectedFunction: "read_json_auto",
		},
		{
			name:             "JSON MIME type",
			input:            "application/json",
			expectedFunction: "read_json_auto",
		},
		{
			name:             "CSV file path",
			input:            "data.csv",
			expectedFunction: "read_csv_auto",
		},
		{
			name:             "CSV MIME type",
			input:            "text/csv",
			expectedFunction: "read_csv_auto",
		},
		{
			name:             "Parquet file path",
			input:            "data.parquet",
			expectedFunction: "read_parquet",
		},
		{
			name:             "Parquet MIME type",
			input:            "application/vnd.apache.parquet",
			expectedFunction: "read_parquet",
		},
		{
			name:             "CSV file path with directory separator",
			input:            "data/file.csv",
			expectedFunction: "read_csv_auto",
		},
		{
			name:             "JSON file path with absolute path",
			input:            "/path/to/data.json",
			expectedFunction: "read_json_auto",
		},
		{
			name:             "Parquet file path with nested directories",
			input:            "subdir/nested/data.parquet",
			expectedFunction: "read_parquet",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			opts, err := duckdb.GetDuckDBReadOptions(tt.input)
			assert.Nil(t, err)
			assert.NotNil(t, opts)
			assert.Equal(t, tt.expectedFunction, opts.ReadFunction)
		})
	}
}
