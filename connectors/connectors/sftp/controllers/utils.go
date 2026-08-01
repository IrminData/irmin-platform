package sftpcontrollers

import (
	"path/filepath"
	"strings"
)

// normalizePath normalizes and validates file paths for SFTP operations.
func normalizePath(path string) string {
	// Clean the path to remove any .. or . components
	cleaned := filepath.Clean(path)

	// Ensure path starts with /
	if !strings.HasPrefix(cleaned, "/") {
		cleaned = "/" + cleaned
	}

	// Remove any double slashes
	cleaned = strings.ReplaceAll(cleaned, "//", "/")

	return cleaned
}
