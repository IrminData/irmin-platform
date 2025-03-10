package utils

import (
	"path"
	"strings"

	irminModels "github.com/IrminData/irmin-sdk-go/models"
)

// contentTypes maps file extensions to their MIME content types.
var contentTypes = map[string]string{
	".json":    "application/json",               // JSON
	".csv":     "text/csv",                       // CSV
	".parquet": "application/vnd.apache.parquet", // Parquet
	".avro":    "application/vnd.apache.avro",    // Avro
	".orc":     "application/vnd.apache.orc",     // ORC (if no standard exists, this can be customised)
	".xml":     "application/xml",                // XML
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
	contentType, isStructured := contentTypes[ext]

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
		// For unrecognised extensions, default to binary.
		objectType = irminModels.ObjectTypeBinary
		contentType = "application/octet-stream"
	}

	// Return the object details.
	return ObjectDetails{
		Name:        name,
		FullPath:    cleanPath,
		Type:        objectType,
		ContentType: contentType,
	}
}
