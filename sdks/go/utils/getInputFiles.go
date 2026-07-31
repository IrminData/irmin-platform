package irminutils

import (
	"fmt"
	"os"
	"path/filepath"
)

// GetInputFile reads a file from the _input directory.
// Returns the file content as bytes and any error encountered.
func GetInputFile(filePath string) ([]byte, error) {
	// Construct the full path to the input file
	fullPath := filepath.Join("_input", filePath)

	// Read the file content
	content, err := os.ReadFile(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read input file %s: %w", filePath, err)
	}

	return content, nil
}

// ListInputFiles returns a list of all files in the _input directory.
// Returns a slice of file paths relative to the _input directory and any error encountered.
func ListInputFiles() ([]string, error) {
	var files []string

	// Walk through the _input directory
	err := filepath.Walk("_input", func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip the _input directory itself
		if path == "_input" {
			return nil
		}

		// Skip directories
		if info.IsDir() {
			return nil
		}

		// Get the relative path from _input
		relPath, err := filepath.Rel("_input", path)
		if err != nil {
			return fmt.Errorf("failed to get relative path for %s: %w", path, err)
		}

		files = append(files, relPath)
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to list input files: %w", err)
	}

	return files, nil
}
