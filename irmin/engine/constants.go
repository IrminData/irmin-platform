package engine

import "slices"

const (
	// pathSplitLimit is the number of parts to split a path into when separating
	// the immediate component from the rest of the path.
	pathSplitLimit = 2
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
