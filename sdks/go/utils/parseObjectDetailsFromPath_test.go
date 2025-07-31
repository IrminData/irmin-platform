package irminutils_test

import (
	"testing"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
	irminutils "github.com/IrminData/irmin-sdk-go/utils"
)

func TestParseObjectDetailsFromPath(t *testing.T) {
	tests := []struct {
		name                string
		input               string
		expectedName        string
		expectedFullPath    string
		expectedType        irminmodels.ObjectType
		expectedContentType string
	}{
		// Structured files
		{
			name:                "JSON file",
			input:               "/data/file.json",
			expectedName:        "file.json",
			expectedFullPath:    "data/file.json",
			expectedType:        irminmodels.ObjectTypeStructured,
			expectedContentType: "application/json",
		},
		{
			name:                "CSV file",
			input:               "data.csv",
			expectedName:        "data.csv",
			expectedFullPath:    "data.csv",
			expectedType:        irminmodels.ObjectTypeStructured,
			expectedContentType: "text/csv",
		},
		{
			name:                "Parquet file",
			input:               "/analytics/data.parquet",
			expectedName:        "data.parquet",
			expectedFullPath:    "analytics/data.parquet",
			expectedType:        irminmodels.ObjectTypeStructured,
			expectedContentType: "application/vnd.apache.parquet",
		},
		{
			name:                "Excel XLSX file",
			input:               "spreadsheet.xlsx",
			expectedName:        "spreadsheet.xlsx",
			expectedFullPath:    "spreadsheet.xlsx",
			expectedType:        irminmodels.ObjectTypeStructured,
			expectedContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		},
		{
			name:                "Avro file",
			input:               "/schemas/user.avro",
			expectedName:        "user.avro",
			expectedFullPath:    "schemas/user.avro",
			expectedType:        irminmodels.ObjectTypeStructured,
			expectedContentType: "application/vnd.apache.avro",
		},
		{
			name:                "YAML file",
			input:               "config.yaml",
			expectedName:        "config.yaml",
			expectedFullPath:    "config.yaml",
			expectedType:        irminmodels.ObjectTypeStructured,
			expectedContentType: "application/x-yaml",
		},

		// Binary/Unstructured files
		{
			name:                "Text file",
			input:               "/docs/readme.txt",
			expectedName:        "readme.txt",
			expectedFullPath:    "docs/readme.txt",
			expectedType:        irminmodels.ObjectTypeBinary,
			expectedContentType: "text/plain",
		},
		{
			name:                "PDF file",
			input:               "document.pdf",
			expectedName:        "document.pdf",
			expectedFullPath:    "document.pdf",
			expectedType:        irminmodels.ObjectTypeBinary,
			expectedContentType: "application/pdf",
		},
		{
			name:                "Image PNG",
			input:               "/images/logo.png",
			expectedName:        "logo.png",
			expectedFullPath:    "images/logo.png",
			expectedType:        irminmodels.ObjectTypeBinary,
			expectedContentType: "image/png",
		},
		{
			name:                "JavaScript file",
			input:               "app.js",
			expectedName:        "app.js",
			expectedFullPath:    "app.js",
			expectedType:        irminmodels.ObjectTypeBinary,
			expectedContentType: "application/javascript",
		},
		{
			name:                "Unknown extension",
			input:               "file.unknown",
			expectedName:        "file.unknown",
			expectedFullPath:    "file.unknown",
			expectedType:        irminmodels.ObjectTypeBinary,
			expectedContentType: "application/octet-stream",
		},

		// Groups/Directories
		{
			name:                "Directory no extension",
			input:               "/path/to/group",
			expectedName:        "group",
			expectedFullPath:    "path/to/group/",
			expectedType:        irminmodels.ObjectTypeGroup,
			expectedContentType: "",
		},
		{
			name:                "Directory simple",
			input:               "folder",
			expectedName:        "folder",
			expectedFullPath:    "folder/",
			expectedType:        irminmodels.ObjectTypeGroup,
			expectedContentType: "",
		},
		{
			name:                "Empty path",
			input:               "",
			expectedName:        "",
			expectedFullPath:    "",
			expectedType:        irminmodels.ObjectTypeGroup,
			expectedContentType: "",
		},
		{
			name:                "Root path",
			input:               "/",
			expectedName:        "",
			expectedFullPath:    "",
			expectedType:        irminmodels.ObjectTypeGroup,
			expectedContentType: "",
		},
		{
			name:                "Path with trailing slash",
			input:               "/data/folder/",
			expectedName:        "",
			expectedFullPath:    "",
			expectedType:        irminmodels.ObjectTypeGroup,
			expectedContentType: "",
		},

		// Edge cases
		{
			name:                "Hidden file with extension",
			input:               ".env.json",
			expectedName:        ".env.json",
			expectedFullPath:    ".env.json",
			expectedType:        irminmodels.ObjectTypeStructured,
			expectedContentType: "application/json",
		},
		{
			name:                "File with multiple dots",
			input:               "data.backup.csv",
			expectedName:        "data.backup.csv",
			expectedFullPath:    "data.backup.csv",
			expectedType:        irminmodels.ObjectTypeStructured,
			expectedContentType: "text/csv",
		},
		{
			name:                "Case sensitive extension",
			input:               "file.JSON",
			expectedName:        "file.JSON",
			expectedFullPath:    "file.JSON",
			expectedType:        irminmodels.ObjectTypeStructured,
			expectedContentType: "application/json",
		},
		{
			name:                "Deep nested path",
			input:               "/very/deep/nested/path/file.parquet",
			expectedName:        "file.parquet",
			expectedFullPath:    "very/deep/nested/path/file.parquet",
			expectedType:        irminmodels.ObjectTypeStructured,
			expectedContentType: "application/vnd.apache.parquet",
		},

		// Media files
		{
			name:                "Video file",
			input:               "video.mp4",
			expectedName:        "video.mp4",
			expectedFullPath:    "video.mp4",
			expectedType:        irminmodels.ObjectTypeBinary,
			expectedContentType: "video/mp4",
		},
		{
			name:                "Audio file",
			input:               "song.mp3",
			expectedName:        "song.mp3",
			expectedFullPath:    "song.mp3",
			expectedType:        irminmodels.ObjectTypeBinary,
			expectedContentType: "audio/mpeg",
		},
		{
			name:                "Archive file",
			input:               "backup.zip",
			expectedName:        "backup.zip",
			expectedFullPath:    "backup.zip",
			expectedType:        irminmodels.ObjectTypeBinary,
			expectedContentType: "application/zip",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := irminutils.ParseObjectDetailsFromPath(tt.input)

			if result.Name != tt.expectedName {
				t.Errorf(
					"ParseObjectDetailsFromPath(%q).Name = %q, expected %q",
					tt.input,
					result.Name,
					tt.expectedName,
				)
			}

			if result.FullPath != tt.expectedFullPath {
				t.Errorf(
					"ParseObjectDetailsFromPath(%q).FullPath = %q, expected %q",
					tt.input,
					result.FullPath,
					tt.expectedFullPath,
				)
			}

			if result.Type != tt.expectedType {
				t.Errorf(
					"ParseObjectDetailsFromPath(%q).Type = %v, expected %v",
					tt.input,
					result.Type,
					tt.expectedType,
				)
			}

			if result.ContentType != tt.expectedContentType {
				t.Errorf(
					"ParseObjectDetailsFromPath(%q).ContentType = %q, expected %q",
					tt.input,
					result.ContentType,
					tt.expectedContentType,
				)
			}
		})
	}
}

func TestParseObjectDetailsFromPathAllStructuredTypes(t *testing.T) {
	structuredExtensions := map[string]string{
		".json":    "application/json",
		".csv":     "text/csv",
		".parquet": "application/vnd.apache.parquet",
		".avro":    "application/vnd.apache.avro",
		".orc":     "application/vnd.apache.orc",
		".delta":   "application/x-delta-lake",
		".iceberg": "application/x-iceberg",
		".xlsx":    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		".xls":     "application/vnd.ms-excel",
		".xlsm":    "application/vnd.ms-excel.sheet.macroEnabled.12",
		".xlsb":    "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
		".tsv":     "text/tab-separated-values",
		".tab":     "text/tab-separated-values",
		".jsonl":   "application/jsonl",
		".ndjson":  "application/x-ndjson",
		".xml":     "application/xml",
		".yaml":    "application/x-yaml",
		".yml":     "application/x-yaml",
	}

	for ext, expectedContentType := range structuredExtensions {
		t.Run("structured_"+ext, func(t *testing.T) {
			filename := "test" + ext
			result := irminutils.ParseObjectDetailsFromPath(filename)

			if result.Type != irminmodels.ObjectTypeStructured {
				t.Errorf(
					"ParseObjectDetailsFromPath(%q).Type = %v, expected %v",
					filename,
					result.Type,
					irminmodels.ObjectTypeStructured,
				)
			}

			if result.ContentType != expectedContentType {
				t.Errorf(
					"ParseObjectDetailsFromPath(%q).ContentType = %q, expected %q",
					filename,
					result.ContentType,
					expectedContentType,
				)
			}
		})
	}
}
