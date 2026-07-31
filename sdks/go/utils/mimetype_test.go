package irminutils_test

import (
	"bytes"
	"testing"

	irminutils "github.com/IrminData/irmin-platform/sdks/go/utils"
)

func TestDetectMimeType(t *testing.T) {
	tests := []struct {
		name     string
		content  []byte
		filename string
		expected string
	}{
		// Specialized extensions take priority regardless of content
		{
			name:     "Parquet extension with no content",
			content:  nil,
			filename: "data.parquet",
			expected: "application/vnd.apache.parquet",
		},
		{
			name:     "Avro extension",
			content:  nil,
			filename: "data.avro",
			expected: "application/vnd.apache.avro",
		},
		{
			name:     "YAML extension",
			content:  nil,
			filename: "config.yaml",
			expected: "application/x-yaml",
		},

		// Content-based detection
		{
			name:     "PNG content with matching extension",
			content:  []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A},
			filename: "image.png",
			expected: "image/png",
		},
		{
			name:     "PNG content with no extension",
			content:  []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A},
			filename: "file",
			expected: "image/png",
		},
		{
			name:     "JSON content with extension",
			content:  []byte(`{"key": "value"}`),
			filename: "data.json",
			expected: "application/json",
		},
		{
			name:     "PDF magic bytes",
			content:  []byte("%PDF-1.4 test content"),
			filename: "doc.pdf",
			expected: "application/pdf",
		},

		// Extension fallback when content is empty
		{
			name:     "JSON extension no content",
			content:  nil,
			filename: "data.json",
			expected: "application/json",
		},
		{
			name:     "CSV extension no content",
			content:  nil,
			filename: "data.csv",
			expected: "text/csv",
		},
		{
			name:     "Text extension no content",
			content:  nil,
			filename: "readme.txt",
			expected: "text/plain",
		},

		// Unknown
		{
			name:     "Unknown binary no extension",
			content:  []byte{0x00, 0x01, 0x02, 0x03},
			filename: "file",
			expected: "application/octet-stream",
		},
		{
			name:     "Unknown extension no content",
			content:  nil,
			filename: "file.unknown",
			expected: "application/octet-stream",
		},

		// Empty everything
		{
			name:     "Empty content and filename",
			content:  nil,
			filename: "",
			expected: "application/octet-stream",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := irminutils.DetectMimeType(tt.content, tt.filename)
			if result != tt.expected {
				t.Errorf("DetectMimeType(%v, %q) = %q, expected %q",
					tt.content != nil, tt.filename, result, tt.expected)
			}
		})
	}
}

func TestDetectMimeTypeByExtension(t *testing.T) {
	// Verify all specialized types return expected values
	specializedTests := map[string]string{
		"data.parquet": "application/vnd.apache.parquet",
		"data.avro":    "application/vnd.apache.avro",
		"data.orc":     "application/vnd.apache.orc",
		"data.delta":   "application/x-delta-lake",
		"data.iceberg": "application/x-iceberg",
		"data.jsonl":   "application/jsonl",
		"data.ndjson":  "application/x-ndjson",
		"data.tsv":     "text/tab-separated-values",
		"data.tab":     "text/tab-separated-values",
		"config.yaml":  "application/x-yaml",
		"config.yml":   "application/x-yaml",
		"data.xlsb":    "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
		"data.xlsm":    "application/vnd.ms-excel.sheet.macroEnabled.12",
		"image.heic":   "image/heic",
		"image.heif":   "image/heif",
		"image.avif":   "image/avif",
		"image.webp":   "image/webp",
		"audio.opus":   "audio/opus",
		"audio.flac":   "audio/flac",
		"font.woff":    "font/woff",
		"font.woff2":   "font/woff2",
		"font.otf":     "font/otf",
		"font.ttf":     "font/ttf",
		"app.js":       "application/javascript",
		"data.json":    "application/json",
		"data.csv":     "text/csv",
		"readme.txt":   "text/plain",
		"doc.pdf":      "application/pdf",
		"image.png":    "image/png",
		"data.xlsx":    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"data.xls":     "application/vnd.ms-excel",
		"data.xml":     "application/xml",
		"data.zip":     "application/zip",
		"file.unknown": "application/octet-stream",
	}

	for filename, expected := range specializedTests {
		t.Run(filename, func(t *testing.T) {
			result := irminutils.DetectMimeTypeByExtension(filename)
			if result != expected {
				t.Errorf("DetectMimeTypeByExtension(%q) = %q, expected %q",
					filename, result, expected)
			}
		})
	}
}

func TestDetectMimeTypeFromReader(t *testing.T) {
	// Specialized extension takes priority over reader content
	t.Run("Parquet extension ignores reader", func(t *testing.T) {
		r := bytes.NewReader([]byte("not really parquet"))
		result, err := irminutils.DetectMimeTypeFromReader(r, "data.parquet")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result != "application/vnd.apache.parquet" {
			t.Errorf("got %q, expected %q", result, "application/vnd.apache.parquet")
		}
	})

	t.Run("PNG reader detection", func(t *testing.T) {
		pngBytes := []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
		r := bytes.NewReader(pngBytes)
		result, err := irminutils.DetectMimeTypeFromReader(r, "file")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result != "image/png" {
			t.Errorf("got %q, expected %q", result, "image/png")
		}
	})
}

func TestIsBinaryMimeType(t *testing.T) {
	tests := []struct {
		mimeType string
		expected bool
	}{
		// Images
		{"image/png", true},
		{"image/jpeg", true},
		{"image/gif", true},
		{"image/webp", true},
		{"image/svg+xml", false},       // SVG is text-based XML
		{"image/custom-unknown", true}, // prefix match

		// Audio/Video
		{"audio/mpeg", true},
		{"audio/wav", true},
		{"video/mp4", true},
		{"video/webm", true},

		// Fonts
		{"font/woff", true},
		{"font/woff2", true},
		{"font/otf", true},
		{"font/ttf", true},

		// Binary application types
		{"application/pdf", true},
		{"application/zip", true},
		{"application/gzip", true},
		{"application/x-rar-compressed", true},
		{"application/vnd.rar", true},
		{"application/x-7z-compressed", true},
		{"application/octet-stream", true},
		{"application/x-binary", true},
		{"application/msword", true},
		{"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", true},

		// With parameters
		{"image/png; charset=utf-8", true},

		// Non-binary
		{"text/plain", false},
		{"text/html", false},
		{"application/json", false},
		{"application/xml", false},
		{"application/javascript", false},
		{"", false},
	}

	for _, tt := range tests {
		t.Run(tt.mimeType, func(t *testing.T) {
			result := irminutils.IsBinaryMimeType(tt.mimeType)
			if result != tt.expected {
				t.Errorf("IsBinaryMimeType(%q) = %v, expected %v",
					tt.mimeType, result, tt.expected)
			}
		})
	}
}

func TestIsTextMimeType(t *testing.T) {
	tests := []struct {
		mimeType string
		expected bool
	}{
		// Text types
		{"text/plain", true},
		{"text/html", true},
		{"text/csv", true},
		{"text/xml", true},
		{"text/plain; charset=utf-8", true},

		// Application text types
		{"application/json", true},
		{"application/ld+json", true},
		{"application/xml", true},
		{"application/xhtml+xml", true},
		{"application/x-yaml", true},
		{"application/yaml", true},
		{"application/csv", true},
		{"application/sql", true},
		{"application/graphql", true},
		{"application/javascript", true},
		{"application/ecmascript", true},
		{"application/x-latex", true},
		{"application/x-sh", true},
		{"application/x-toml", true},
		{"application/x-ini", true},
		{"application/jsonl", true},
		{"application/x-ndjson", true},

		// Text-based image types
		{"image/svg+xml", true},

		// Non-text
		{"image/png", false},
		{"application/pdf", false},
		{"application/octet-stream", false},
		{"application/zip", false},
		{"", false},
	}

	for _, tt := range tests {
		t.Run(tt.mimeType, func(t *testing.T) {
			result := irminutils.IsTextMimeType(tt.mimeType)
			if result != tt.expected {
				t.Errorf("IsTextMimeType(%q) = %v, expected %v",
					tt.mimeType, result, tt.expected)
			}
		})
	}
}

func TestStripMimeTypeParameters(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"text/plain; charset=utf-8", "text/plain"},
		{"application/json", "application/json"},
		{"text/html; charset=iso-8859-1; boundary=something", "text/html"},
		{"", ""},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			result := irminutils.StripMimeTypeParameters(tt.input)
			if result != tt.expected {
				t.Errorf("StripMimeTypeParameters(%q) = %q, expected %q",
					tt.input, result, tt.expected)
			}
		})
	}
}
