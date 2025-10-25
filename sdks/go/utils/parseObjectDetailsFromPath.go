package irminutils

import (
	"path"
	"strings"

	irminmodels "github.com/IrminData/irmin-sdk-go/models"
)

// ObjectDetails holds details about an object parsed from its path.
type ObjectDetails struct {
	Name        string                 // The object name.
	FullPath    string                 // The cleaned full path.
	ParentPath  *string                // The parent directory object's path. Nil if the object is the root object.
	Type        irminmodels.ObjectType // The object's type.
	ContentType string                 // The MIME type of the object.
}

// ParseObjectDetailsFromPath parses an object's details from a given path.
// Path examples: "/path/to/object.json", "/object.json", "path/to/object.json", "object.json", "path/to/group", "".
// Returns an ObjectDetails struct.
//
// This function uses a hybrid approach for MIME type detection:
// - Specialized data analytics formats use predefined mappings
// - Standard formats use the system's built-in MIME type database
func ParseObjectDetailsFromPath(inputPath string) ObjectDetails {
	// Clean the path: normalize by removing extra slashes and trim leading slash.
	cleanPath := strings.TrimPrefix(inputPath, "/")
	// Normalize path by removing duplicate slashes
	for strings.Contains(cleanPath, "//") {
		cleanPath = strings.ReplaceAll(cleanPath, "//", "/")
	}

	// Handle empty path (or root path) explicitly.
	if cleanPath == "" || strings.HasSuffix(cleanPath, "/") {
		return ObjectDetails{
			Name:        "",
			FullPath:    "",
			Type:        irminmodels.ObjectTypeGroup,
			ContentType: "",
		}
	}

	// Use the path package to obtain the base name and directory.
	name := path.Base(cleanPath)

	// Find the parent directory path.
	var parentPath *string
	if cleanPath != "/" && cleanPath != "" {
		newParentPath := strings.TrimSuffix(cleanPath, "/")
		newParentPath = strings.TrimSuffix(newParentPath, name)
		// Remove trailing slash temporarily
		newParentPath = strings.TrimSuffix(newParentPath, "/")
		if newParentPath == "/" || newParentPath == "" {
			// Root parent path should be empty string
			newParentPath = ""
		} else {
			// Non-root parent paths should have trailing slash since they are directories
			newParentPath += "/"
		}
		parentPath = &newParentPath
	} else {
		// For the root object, the parent path is nil.
		parentPath = nil
	}

	// Determine the file extension in lower-case.
	lowerName := strings.ToLower(name)
	ext := path.Ext(lowerName)

	// Determine if this should be treated as a group (directory)
	isGroupFile := isGroup(name, ext)

	var objectType irminmodels.ObjectType
	var contentType string

	// Handle groups first
	if isGroupFile {
		objectType = irminmodels.ObjectTypeGroup
		contentType = ""
		cleanPath += "/" // Add a trailing slash since groups are bucket object prefixes.
	} else {
		// Use hybrid MIME type detection for files
		contentType = GetContentTypeHybrid(ext)

		// Determine object type based on content type and extension
		if IsStructuredDataFormat(ext, contentType) {
			objectType = irminmodels.ObjectTypeStructured
		} else {
			objectType = irminmodels.ObjectTypeBinary
		}
	}

	// Return the object details.
	return ObjectDetails{
		Name:        name,
		FullPath:    cleanPath,
		ParentPath:  parentPath,
		Type:        objectType,
		ContentType: contentType,
	}
}

// GetContentTypeHybrid uses a hybrid approach for MIME type detection.
// It first checks for specialized data analytics formats that aren't typically
// registered in system MIME databases, then falls back to the system's built-in
// MIME type detection for standard formats.
//
// To maintain backward compatibility with existing tests, this function:
// - Uses specialized mappings for data analytics formats
// - Falls back to system MIME types but strips charset parameters
// - Maintains specific legacy MIME types where expected by existing code
func GetContentTypeHybrid(ext string) string {
	// Specialized data analytics and custom formats
	specializedTypes := map[string]string{
		// Advanced analytics formats
		".parquet": "application/vnd.apache.parquet", // Apache Parquet
		".avro":    "application/vnd.apache.avro",    // Apache Avro
		".orc":     "application/vnd.apache.orc",     // Apache ORC
		".delta":   "application/x-delta-lake",       // Delta Lake
		".iceberg": "application/x-iceberg",          // Apache Iceberg

		// Specialized text formats for data processing
		".jsonl":  "application/jsonl",         // JSON Lines / Newline-delimited JSON
		".ndjson": "application/x-ndjson",      // Newline-delimited JSON (alternative)
		".tsv":    "text/tab-separated-values", // Tab-separated values
		".tab":    "text/tab-separated-values", // Tab-separated values (alternative)
		".yaml":   "application/x-yaml",        // YAML (keep consistent for data processing)
		".yml":    "application/x-yaml",        // YAML alternative extension

		// Excel binary formats (might not be in all systems)
		".xlsb": "application/vnd.ms-excel.sheet.binary.macroEnabled.12", // Excel binary
		".xlsm": "application/vnd.ms-excel.sheet.macroEnabled.12",        // Excel with macros

		// Modern image formats that may not be universally recognized
		".heic": "image/heic", // Apple HEIC format
		".heif": "image/heif", // Apple HEIF format
		".avif": "image/avif", // AV1 Image File Format (fallback if not detected)
		".webp": "image/webp", // WebP (fallback if not detected)

		// Modern audio formats that may not be universally recognized
		".opus": "audio/opus", // Opus audio codec
		".flac": "audio/flac", // FLAC lossless audio

		// Font formats that may not be universally recognized
		".woff":  "font/woff",  // Web Open Font Format
		".woff2": "font/woff2", // Web Open Font Format 2.0
		".otf":   "font/otf",   // OpenType Font
		".ttf":   "font/ttf",   // TrueType Font

		// Legacy overrides for backward compatibility
		".js": "application/javascript", // Keep legacy JavaScript MIME type for compatibility
	}

	// Check if it's a specialized format first
	if mimeType, exists := specializedTypes[ext]; exists {
		return mimeType
	}

	// Fall back to system-registered MIME types for standard formats
	systemMimeType := AutoDetectMimeType("file" + ext)

	// Strip charset and other parameters to maintain backward compatibility
	return StripMimeTypeParameters(systemMimeType)
}

// StripMimeTypeParameters removes charset and other parameters from MIME types
// to maintain backward compatibility with existing test expectations.
func StripMimeTypeParameters(mimeType string) string {
	if idx := strings.Index(mimeType, ";"); idx != -1 {
		return strings.TrimSpace(mimeType[:idx])
	}
	return mimeType
}

// IsStructuredDataFormat determines if a file extension and MIME type represent
// structured data that can be queried, analyzed, or processed as tabular data.
func IsStructuredDataFormat(ext, contentType string) bool {
	// Define extensions that represent structured data formats
	structuredExtensions := map[string]bool{
		// Standard tabular formats
		".json": true, // JSON
		".csv":  true, // Comma-separated values
		".xml":  true, // XML

		// Advanced analytics formats
		".parquet": true, // Apache Parquet
		".avro":    true, // Apache Avro
		".orc":     true, // Apache ORC
		".delta":   true, // Delta Lake
		".iceberg": true, // Apache Iceberg

		// Excel formats (all variants)
		".xlsx": true, // Excel (Office Open XML)
		".xls":  true, // Excel (Legacy)
		".xlsm": true, // Excel with macros
		".xlsb": true, // Excel binary

		// Text-based structured formats
		".tsv":    true, // Tab-separated values
		".tab":    true, // Tab-separated values (alternative)
		".jsonl":  true, // JSON Lines / Newline-delimited JSON
		".ndjson": true, // Newline-delimited JSON
		".yaml":   true, // YAML
		".yml":    true, // YAML (alternative extension)
	}

	// Check by extension first
	if structuredExtensions[ext] {
		return true
	}

	// Check by MIME type for cases where extension might not be definitive
	structuredMimeTypes := map[string]bool{
		"application/json":               true,
		"text/csv":                       true,
		"application/xml":                true,
		"text/xml":                       true,
		"application/vnd.apache.parquet": true,
		"application/vnd.apache.avro":    true,
		"application/vnd.apache.orc":     true,
		"application/x-delta-lake":       true,
		"application/x-iceberg":          true,
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": true,
		"application/vnd.ms-excel":                              true,
		"application/vnd.ms-excel.sheet.macroEnabled.12":        true,
		"application/vnd.ms-excel.sheet.binary.macroEnabled.12": true,
		"text/tab-separated-values":                             true,
		"application/jsonl":                                     true,
		"application/x-ndjson":                                  true,
		"text/yaml":                                             true,
		"application/x-yaml":                                    true,
	}

	// Handle MIME types with additional parameters (like charset)
	// Extract the base MIME type before the first semicolon
	baseMimeType := contentType
	if semicolonIndex := strings.Index(contentType, ";"); semicolonIndex != -1 {
		baseMimeType = contentType[:semicolonIndex]
	}

	return structuredMimeTypes[baseMimeType]
}

// isGroup determines if a name should be treated as a group (directory)
func isGroup(name, ext string) bool {
	// Files ending with just a dot (like "file.") are groups
	if strings.HasSuffix(name, ".") && len(ext) == 1 {
		return true
	}

	// Empty extension means it's a directory/group
	if ext == "" {
		return true
	}

	// Hidden files/directories starting with . and having ext == name are groups
	// e.g., ".config" where ext = ".config" and name = ".config"
	if strings.HasPrefix(name, ".") && ext == name {
		return true
	}

	return false
}
