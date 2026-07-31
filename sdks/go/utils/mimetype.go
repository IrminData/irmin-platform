package irminutils

import (
	"io"
	"mime"
	"path/filepath"
	"strings"

	"github.com/gabriel-vasile/mimetype"
)

// specializedTypes maps file extensions to MIME types for formats that aren't
// typically registered in system MIME databases (analytics, modern media, fonts).
//
//nolint:gochecknoglobals // Package-level lookup table for efficiency
var specializedTypes = map[string]string{
	// Advanced analytics formats
	".parquet": "application/vnd.apache.parquet",
	".avro":    "application/vnd.apache.avro",
	".orc":     "application/vnd.apache.orc",
	".delta":   "application/x-delta-lake",
	".iceberg": "application/x-iceberg",

	// Specialized text formats for data processing
	".jsonl":  "application/jsonl",
	".ndjson": "application/x-ndjson",
	".tsv":    "text/tab-separated-values",
	".tab":    "text/tab-separated-values",
	".xml":    "application/xml",
	".yaml":   "application/x-yaml",
	".yml":    "application/x-yaml",

	// Excel binary formats (might not be in all systems)
	".xlsb": "application/vnd.ms-excel.sheet.binary.macroEnabled.12",
	".xlsm": "application/vnd.ms-excel.sheet.macroEnabled.12",

	// Modern image formats that may not be universally recognized
	".heic": "image/heic",
	".heif": "image/heif",
	".avif": "image/avif",
	".webp": "image/webp",

	// Modern audio formats that may not be universally recognized
	".opus": "audio/opus",
	".flac": "audio/flac",

	// Font formats that may not be universally recognized
	".woff":  "font/woff",
	".woff2": "font/woff2",
	".otf":   "font/otf",
	".ttf":   "font/ttf",

	// Legacy overrides for backward compatibility
	".js": "application/javascript",
}

// binaryApplicationTypes are application/* MIME types that represent binary data.
//
//nolint:gochecknoglobals // Package-level lookup table for efficiency
var binaryApplicationTypes = map[string]bool{
	// Documents
	"application/pdf":    true,
	"application/msword": true,
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": true,
	"application/vnd.ms-excel": true,
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":         true,
	"application/vnd.ms-powerpoint":                                             true,
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": true,

	// Archives
	"application/zip":              true,
	"application/gzip":             true,
	"application/x-tar":            true,
	"application/x-rar-compressed": true,
	"application/vnd.rar":          true,
	"application/x-7z-compressed":  true,
	"application/x-bzip":           true,
	"application/x-bzip2":          true,

	// Generic binary
	defaultMimeType:        true,
	"application/x-binary": true,
}

// textApplicationTypes are application/* MIME types that represent text-based content.
//
//nolint:gochecknoglobals // Package-level lookup table for efficiency
var textApplicationTypes = map[string]bool{
	"application/json":       true,
	"application/ld+json":    true,
	"application/xml":        true,
	"application/xhtml+xml":  true,
	"application/x-yaml":     true,
	"application/yaml":       true,
	"application/csv":        true,
	"application/sql":        true,
	"application/graphql":    true,
	"application/javascript": true,
	"application/ecmascript": true,
	"application/x-latex":    true,
	"application/x-sh":       true,
	"application/x-toml":     true,
	"application/x-ini":      true,
	"application/jsonl":      true,
	"application/x-ndjson":   true,
}

// DetectMimeType detects MIME type using both content (magic bytes) and filename extension.
// It checks specialized extension mappings first, then uses the mimetype library for
// content-based detection, and falls back to system extension mapping.
func DetectMimeType(content []byte, filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))

	// Specialized formats take priority (analytics, fonts, etc.)
	if mimeType, exists := specializedTypes[ext]; exists {
		return mimeType
	}

	// Content-based detection using mimetype library (reads first 3072 bytes)
	if len(content) > 0 {
		detected := mimetype.Detect(content)
		if detected.String() != defaultMimeType {
			return StripMimeTypeParameters(detected.String())
		}
	}

	// Extension-based fallback via system MIME database
	if ext != "" {
		if mimeType := mime.TypeByExtension(ext); mimeType != "" {
			return StripMimeTypeParameters(mimeType)
		}
	}

	return defaultMimeType
}

// DetectMimeTypeByExtension detects MIME type from filename extension only.
// It checks specialized data analytics format mappings first, then falls back
// to the system's built-in MIME type database.
func DetectMimeTypeByExtension(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))

	if mimeType, exists := specializedTypes[ext]; exists {
		return mimeType
	}

	if ext != "" {
		if mimeType := mime.TypeByExtension(ext); mimeType != "" {
			return StripMimeTypeParameters(mimeType)
		}
	}

	return defaultMimeType
}

// DetectMimeTypeFromReader detects MIME type from an io.Reader and filename.
// The mimetype library internally reads only the first 3072 bytes from the reader.
// Note: the reader will be partially consumed after this call.
func DetectMimeTypeFromReader(r io.Reader, filename string) (string, error) {
	ext := strings.ToLower(filepath.Ext(filename))

	// Specialized formats take priority
	if mimeType, exists := specializedTypes[ext]; exists {
		return mimeType, nil
	}

	detected, err := mimetype.DetectReader(r)
	if err != nil {
		return defaultMimeType, err
	}

	if detected.String() != defaultMimeType {
		return StripMimeTypeParameters(detected.String()), nil
	}

	if ext != "" {
		if mimeType := mime.TypeByExtension(ext); mimeType != "" {
			return StripMimeTypeParameters(mimeType), nil
		}
	}

	return defaultMimeType, nil
}

// IsBinaryMimeType checks if the given MIME type represents binary data.
// SVG (image/svg+xml) is excluded since it is a text-based XML format.
func IsBinaryMimeType(contentType string) bool {
	ct := StripMimeTypeParameters(strings.ToLower(contentType))

	// SVG is XML-based text, not binary
	if ct == "image/svg+xml" {
		return false
	}

	if strings.HasPrefix(ct, "image/") ||
		strings.HasPrefix(ct, "audio/") ||
		strings.HasPrefix(ct, "video/") ||
		strings.HasPrefix(ct, "font/") {
		return true
	}

	return binaryApplicationTypes[ct]
}

// textImageTypes are image/* MIME types that are actually text-based.
//
//nolint:gochecknoglobals // Package-level lookup table for efficiency
var textImageTypes = map[string]bool{
	"image/svg+xml": true,
}

// IsTextMimeType checks if the given MIME type represents text-based content
// suitable for display or processing as text.
func IsTextMimeType(mimeType string) bool {
	ct := StripMimeTypeParameters(strings.ToLower(mimeType))

	if strings.HasPrefix(ct, "text/") {
		return true
	}

	return textApplicationTypes[ct] || textImageTypes[ct]
}

// defaultMimeType is the fallback MIME type for unrecognized content.
const defaultMimeType = "application/octet-stream"

// StripMimeTypeParameters removes charset and other parameters from MIME types.
// For example, "text/plain; charset=utf-8" becomes "text/plain".
func StripMimeTypeParameters(mimeType string) string {
	if idx := strings.Index(mimeType, ";"); idx != -1 {
		return strings.TrimSpace(mimeType[:idx])
	}
	return mimeType
}
