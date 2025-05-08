package utils

import (
	"errors"
	"os"
	"path/filepath"
	"runtime"
)

// FindProjectRoot traverses upwards from the current directory until it finds a "go.mod" file.
// If a ".env" file is found in the current working directory, it returns that directory.
func FindProjectRoot() (string, error) {
	// First, check if the current working directory has a .env file.
	if cwd, err := os.Getwd(); err == nil {
		if _, err := os.Stat(filepath.Join(cwd, ".env")); err == nil {
			return cwd, nil
		}
	}

	// Otherwise, use runtime.Caller to locate the source file and search upward.
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		return "", errors.New("failed to get caller info")
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
	return "", errors.New("project root not found")
}
