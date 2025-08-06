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
func ParseObjectDetailsFromPath(inputPath string) ObjectDetails {
	// structuredContentTypes maps structured file extensions to their MIME content types.
	var structuredContentTypes = map[string]string{
		// Standard formats
		".json":    "application/json",               // JSON
		".csv":     "text/csv",                       // CSV
		".parquet": "application/vnd.apache.parquet", // Parquet

		// Advanced analytics formats
		".avro":    "application/vnd.apache.avro", // Avro
		".orc":     "application/vnd.apache.orc",  // ORC
		".delta":   "application/x-delta-lake",    // Delta Lake
		".iceberg": "application/x-iceberg",       // Apache Iceberg

		// Excel formats
		".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // Excel (Office Open XML)
		".xls":  "application/vnd.ms-excel",                                          // Excel (Legacy)
		".xlsm": "application/vnd.ms-excel.sheet.macroEnabled.12",                    // Excel with macros
		".xlsb": "application/vnd.ms-excel.sheet.binary.macroEnabled.12",             // Excel binary

		// Text-based formats
		".tsv":    "text/tab-separated-values", // Tab-separated values
		".tab":    "text/tab-separated-values", // Tab-separated values (alternative)
		".jsonl":  "application/jsonl",         // JSON Lines / Newline-delimited JSON
		".ndjson": "application/x-ndjson",      // Newline-delimited JSON
		".xml":    "application/xml",           // XML
		".yaml":   "application/x-yaml",        // YAML
		".yml":    "application/x-yaml",        // YAML (alternative extension)
	}

	// unstructuredContentTypes maps unstructured file extensions to their MIME content types.
	// These are typically binary or image files.
	// Note: Some of these types are not standard and may vary by implementation.
	var unstructuredContentTypes = map[string]string{
		".txt":  "text/plain",             // Text
		".html": "text/html",              // HTML
		".css":  "text/css",               // CSS
		".js":   "application/javascript", // JavaScript
		".pdf":  "application/pdf",        // PDF
		".zip":  "application/zip",        // ZIP
		".tar":  "application/x-tar",      // TAR
		".jpg":  "image/jpeg",             // JPEG
		".jpeg": "image/jpeg",             // JPEG
		".webp": "image/webp",             // WebP
		".svg":  "image/svg+xml",          // SVG
		".ico":  "image/x-icon",           // ICO
		".bmp":  "image/bmp",              // BMP
		".heic": "image/heic",             // HEIC
		".heif": "image/heif",             // HEIF
		".avif": "image/avif",             // AVIF
		".mp3":  "audio/mpeg",             // MP3
		".wav":  "audio/wav",              // WAV
		".aac":  "audio/aac",              // AAC
		".flac": "audio/flac",             // FLAC
		".ogg":  "audio/ogg",              // OGG
		".opus": "audio/opus",             // Opus
		".png":  "image/png",              // PNG
		".gif":  "image/gif",              // GIF
		".tiff": "image/tiff",             // TIFF
		".mp4":  "video/mp4",              // MP4
	}

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

	// Check if the extension exists in our contentTypes map.
	contentType, isStructured := structuredContentTypes[ext]

	var objectType irminmodels.ObjectType

	// Determine if this should be treated as a group (directory)
	isGroup := isGroup(name, ext)

	// If the extension is found in contentTypes, mark as structured.
	switch {
	case isStructured:
		objectType = irminmodels.ObjectTypeStructured
	case isGroup:
		objectType = irminmodels.ObjectTypeGroup
		contentType = ""
		cleanPath += "/" // Add a trailing slash since groups are bucket object prefixes.
	default:
		// Default the object type to binary.
		objectType = irminmodels.ObjectTypeBinary

		// Check if the extension is in the unstructuredContentTypes map.
		var foundContentType bool
		contentType, foundContentType = unstructuredContentTypes[ext]
		if !foundContentType {
			contentType = "application/octet-stream"
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
