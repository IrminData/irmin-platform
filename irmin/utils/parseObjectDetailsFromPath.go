package utils

import (
	"path"
	"strings"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// structuredContentTypes maps structured file extensions to their MIME content types.
var structuredContentTypes = map[string]string{
	".json":    "application/json",               // JSON
	".csv":     "text/csv",                       // CSV
	".parquet": "application/vnd.apache.parquet", // Parquet
	".avro":    "application/vnd.apache.avro",    // Avro
	".orc":     "application/vnd.apache.orc",     // ORC
	".xml":     "application/xml",                // XML
	".yaml":    "application/x-yaml",             // YAML
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
	".gz":   "application/gzip",       // GZIP
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

// ObjectDetails holds details about an object parsed from its path.
type ObjectDetails struct {
	Name        string                 // The object name.
	FullPath    string                 // The cleaned full path.
	Type        irminModels.ObjectType // The object's type.
	ContentType string                 // The MIME type of the object.
}

// ParseObjectDetailsFromPath parses an object's details from a given path.
// Path examples: "/path/to/object.json", "/object.json", "path/to/object.json", "object.json", "path/to/group", "".
// Returns an ObjectDetails struct.
func ParseObjectDetailsFromPath(inputPath string) ObjectDetails {
	// Clean the path: remove extra slashes.
	cleanPath := strings.Trim(inputPath, "/")

	// Handle empty path (or root path) explicitly.
	if cleanPath == "" {
		return ObjectDetails{
			Name:        "",
			FullPath:    "",
			Type:        irminModels.ObjectTypeGroup,
			ContentType: "",
		}
	}

	// Use the path package to obtain the base name and directory.
	name := path.Base(cleanPath)

	// Determine the file extension in lower-case.
	lowerName := strings.ToLower(name)
	ext := path.Ext(lowerName)

	// Check if the extension exists in our contentTypes map.
	contentType, isStructured := structuredContentTypes[ext]

	// Default the object type to binary.
	objectType := irminModels.ObjectTypeBinary

	// If the extension is found in contentTypes, mark as structured.
	if isStructured {
		objectType = irminModels.ObjectTypeStructured
	} else if !strings.Contains(name, ".") {
		// If there's no dot, assume it's a group.
		objectType = irminModels.ObjectTypeGroup
		contentType = ""
		cleanPath = cleanPath + "/" // Add a trailing slash since groups are bucket object prefixes.
	} else {
		// This is an unstructured file type.
		objectType = irminModels.ObjectTypeBinary
		// Check if the extension is in the unstructuredContentTypes map.
		foundContentType := false
		contentType, foundContentType = unstructuredContentTypes[ext]
		if !foundContentType {
			contentType = "application/octet-stream"
		}
	}

	// Return the object details.
	return ObjectDetails{
		Name:        name,
		FullPath:    cleanPath,
		Type:        objectType,
		ContentType: contentType,
	}
}
