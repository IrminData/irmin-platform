package engine

import (
	"path"
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

// IsSystemPath checks if any component of the given path is a system path that should be hidden.
// The path is normalized first to prevent traversal bypasses (e.g. "foo/../../_lakefs_actions").
func IsSystemPath(p string) bool {
	// systemPaths contains directory names that should be hidden from users.
	// These are used for internal system operations and should not be exposed.
	var systemPaths = []string{
		"_lakefs_actions",
	}

	// Normalize to resolve ".." and "." segments, then strip leading/trailing slashes.
	normalized := strings.Trim(path.Clean("/"+p), "/")

	// Check every component of the path.
	for _, component := range strings.Split(normalized, "/") {
		if slices.Contains(systemPaths, component) {
			return true
		}
	}
	return false
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
