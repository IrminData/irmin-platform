package utils

import (
	"path"
	"strings"
)

// ParseEditorItemLanguageFromPath parses the language of an editor item from its path.
// Path examples: "/path/to/script.js", "/script.js", "path/to/script.go", "script.py", "path/to/group", "".
// Returns the language of the editor item (if any), like "js", "py", "go", etc.
func ParseEditorItemLanguageFromPath(inputPath string) *string {
	// Clean the path: remove extra slashes.
	cleanPath := strings.Trim(inputPath, "/")

	// Handle empty path (or root path) explicitly.
	if cleanPath == "" {
		return nil
	}

	// Use the path package to obtain the base name and directory.
	name := path.Base(cleanPath)

	// Determine the file extension in lower-case.
	lowerName := strings.ToLower(name)
	ext := path.Ext(lowerName)

	// If the extension is empty, return nil.
	// This means the item is a directory or has no extension.
	if ext == "" {
		return nil
	}

	// If the extension is not empty, we can determine the language.
	language := "txt"
	if ext == ".js" {
		language = "js"
	}
	if ext == ".json" {
		language = "json"
	}
	if ext == ".sql" {
		language = "sql"
	}
	if ext == ".go" {
		language = "go"
	}
	if ext == ".py" {
		language = "py"
	}

	return &language
}
