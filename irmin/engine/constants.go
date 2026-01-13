package engine

import (
	"slices"
	"strings"
)

const (
	// pathSplitLimit is the number of parts to split a path into when separating
	// the immediate component from the rest of the path.
	pathSplitLimit = 2

	// File extension constants
	extCSV     = ".csv"
	extTSV     = ".tsv"
	extJSON    = ".json"
	extParquet = ".parquet"

	// PointerFilePrefix is the prefix used to identify pointer files.
	PointerFilePrefix = "_ptr."
)

// IsSystemPath checks if the given path is a system path that should be hidden.
func IsSystemPath(path string) bool {
	// systemPaths contains paths that should be hidden from users.
	// These paths are used for internal system operations and should not be exposed.
	var systemPaths = []string{
		"_lakefs_actions",
	}
	// Check if the path is in the systemPaths array.
	return slices.Contains(systemPaths, path)
}

// IsPointerPath checks if the given path or filename represents a pointer file.
// Pointer files are identified by the "_ptr." prefix in their filename.
// Note: Pointer files are NOT system paths - they are user-visible but have special behavior.
func IsPointerPath(path string) bool {
	// Get the filename from the path
	parts := strings.Split(path, "/")
	filename := parts[len(parts)-1]

	return strings.HasPrefix(filename, PointerFilePrefix)
}
