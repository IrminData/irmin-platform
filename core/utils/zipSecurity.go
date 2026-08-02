package utils

import (
	"fmt"
	"path/filepath"
	"strings"
)

// SanitizeZipEntryPath validates and cleans a zip entry path to prevent zip slip attacks.
// It rejects paths containing ".." components or absolute paths.
func SanitizeZipEntryPath(entryPath string) (string, error) {
	cleaned := filepath.Clean(entryPath)
	cleaned = filepath.ToSlash(cleaned)

	// Reject absolute paths
	if strings.HasPrefix(cleaned, "/") {
		return "", fmt.Errorf("zip entry has absolute path: %s", entryPath)
	}

	// Reject paths that escape the root via ".."
	if strings.HasPrefix(cleaned, "..") || strings.Contains(cleaned, "/../") {
		return "", fmt.Errorf("zip entry contains path traversal: %s", entryPath)
	}

	return cleaned, nil
}
