package utils

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
)

// FindProjectRoot traverses upwards from the current file's directory until it finds a "go.mod" file.
func FindProjectRoot() (string, error) {
	// Determine the directory of this file using runtime.Caller
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		return "", fmt.Errorf("failed to get caller info")
	}
	dir := filepath.Dir(currentFile)
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir { // reached filesystem root
			break
		}
		dir = parent
	}
	return "", fmt.Errorf("project root not found")
}
